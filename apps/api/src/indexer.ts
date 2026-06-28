import { scValToNative, xdr } from '@stellar/stellar-sdk';
import type { Stream, StreamPayClient } from '@streampay/sdk';
import type { AppConfig } from './config';
import type { Db } from './db';
import { dispatchWebhooks } from './webhooks';

const STREAM_EVENT_TYPES = new Set(['created', 'withdraw', 'cancel']);

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = jsonSafe(v);
    return out;
  }
  return value;
}

function decodeValue(value: xdr.ScVal): unknown {
  try {
    return jsonSafe(scValToNative(value));
  } catch {
    return null;
  }
}

function serializeStream(s: Stream) {
  return { ...s, deposit: s.deposit.toString(), withdrawn: s.withdrawn.toString() };
}

/**
 * Polls Soroban RPC for the contract's events and keeps the local DB in sync. The DB is a cache and
 * activity log — the contract remains the source of truth, so a backfill reads every stream
 * directly on startup, and each event triggers a fresh read of the affected stream.
 */
export class Indexer {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly client: StreamPayClient,
    private readonly db: Db,
    private readonly cfg: AppConfig
  ) {}

  async start(): Promise<void> {
    await this.backfill();
    this.running = true;
    void this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  async backfill(): Promise<void> {
    try {
      const total = await this.client.totalStreams();
      for (let id = 0; id < total; id++) {
        try {
          const stream = await this.client.getStream(id);
          this.db.upsertStream(stream, null);
        } catch {
          /* a missing id shouldn't abort the backfill */
        }
      }
      console.log(`[indexer] backfilled ${total} stream(s) from contract`);
    } catch (err) {
      console.warn('[indexer] backfill failed:', (err as Error).message);
    }
  }

  private async loop(): Promise<void> {
    if (!this.running) return;
    try {
      await this.tick();
    } catch (err) {
      console.warn('[indexer] tick error:', (err as Error).message);
    }
    this.timer = setTimeout(() => void this.loop(), this.cfg.indexerIntervalMs);
  }

  async tick(): Promise<void> {
    const server = this.client.rpcServer;
    const latest = await server.getLatestLedger();

    const cursorRaw = this.db.getMeta('cursor_ledger');
    let startLedger = cursorRaw
      ? Number(cursorRaw)
      : Math.max(1, latest.sequence - this.cfg.indexerLookbackLedgers);
    if (startLedger > latest.sequence) startLedger = latest.sequence;

    const res = await server.getEvents({
      startLedger,
      filters: [{ type: 'contract', contractIds: [this.cfg.contractId] }],
      limit: 200,
    });

    for (const ev of res.events) {
      const topics = ev.topic.map((t) => scValToNative(t)) as unknown[];
      const type = String(topics[0]);
      const streamId = topics.length > 1 ? Number(topics[1]) : null;
      const txHash = ev.txHash ?? null;

      if (txHash && this.db.eventExists(txHash, type)) continue;

      this.db.insertEvent({
        type,
        streamId,
        ledger: ev.ledger,
        txHash,
        data: decodeValue(ev.value),
        createdAt: Date.now(),
      });

      if (streamId !== null && STREAM_EVENT_TYPES.has(type)) {
        try {
          const stream = await this.client.getStream(streamId);
          this.db.upsertStream(stream, txHash);
          await dispatchWebhooks(this.db, {
            event: type,
            stream: serializeStream(stream),
            txHash,
            ledger: ev.ledger,
          });
        } catch {
          /* stream read failed; the next tick will retry via backfill cadence */
        }
      }
    }

    this.db.setMeta('cursor_ledger', String(res.latestLedger + 1));
  }
}
