import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Stream } from '@streampay/sdk';

export interface ApiStream {
  id: number;
  sender: string;
  recipient: string;
  token: string;
  deposit: string;
  withdrawn: string;
  startTime: number;
  cliffTime: number;
  endTime: number;
  cancelable: boolean;
  status: number;
  createdAt: number;
  txHash: string | null;
  updatedAt: number;
}

export interface ApiEvent {
  type: string;
  streamId: number | null;
  ledger: number | null;
  txHash: string | null;
  data: unknown;
  createdAt: number;
}

export interface FeedbackEntry {
  id: number;
  wallet: string | null;
  rating: number | null;
  message: string;
  category: string | null;
  createdAt: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS streams (
  id INTEGER PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  token TEXT NOT NULL,
  deposit TEXT NOT NULL,
  withdrawn TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  cliff_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  cancelable INTEGER NOT NULL,
  status INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  tx_hash TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_streams_sender ON streams(sender);
CREATE INDEX IF NOT EXISTS idx_streams_recipient ON streams(recipient);

CREATE TABLE IF NOT EXISTS events (
  uid INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  stream_id INTEGER,
  ledger INTEGER,
  tx_hash TEXT,
  data TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_stream ON events(stream_id);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT,
  rating INTEGER,
  message TEXT NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  wallet TEXT,
  props TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  secret TEXT,
  created_at INTEGER NOT NULL
);
`;

type Row = Record<string, unknown>;

function rowToStream(r: Row): ApiStream {
  return {
    id: Number(r.id),
    sender: String(r.sender),
    recipient: String(r.recipient),
    token: String(r.token),
    deposit: String(r.deposit),
    withdrawn: String(r.withdrawn),
    startTime: Number(r.start_time),
    cliffTime: Number(r.cliff_time),
    endTime: Number(r.end_time),
    cancelable: Number(r.cancelable) === 1,
    status: Number(r.status),
    createdAt: Number(r.created_at),
    txHash: r.tx_hash == null ? null : String(r.tx_hash),
    updatedAt: Number(r.updated_at),
  };
}

/**
 * libSQL-backed store. Works with a local file (`file:…`) in development and a persistent Turso
 * database (`libsql://…` + auth token) in production, so feedback and analytics survive restarts.
 */
export class Db {
  private constructor(private readonly client: Client) {}

  static async create(url: string, authToken?: string): Promise<Db> {
    if (url.startsWith('file:')) {
      const path = url.slice('file:'.length);
      if (path && path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    }
    const client = createClient(authToken ? { url, authToken } : { url });
    await client.executeMultiple(SCHEMA);
    return new Db(client);
  }

  // --- meta / cursor ---
  async getMeta(key: string): Promise<string | null> {
    const r = await this.client.execute({ sql: 'SELECT value FROM meta WHERE key = ?', args: [key] });
    const v = r.rows[0]?.value;
    return v == null ? null : String(v);
  }
  async setMeta(key: string, value: string): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      args: [key, value, value],
    });
  }

  // --- streams ---
  async upsertStream(s: Stream, txHash: string | null, now = Date.now()): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO streams
          (id, sender, recipient, token, deposit, withdrawn, start_time, cliff_time, end_time, cancelable, status, created_at, tx_hash, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           withdrawn = excluded.withdrawn,
           status = excluded.status,
           tx_hash = COALESCE(excluded.tx_hash, streams.tx_hash),
           updated_at = excluded.updated_at`,
      args: [
        s.id,
        s.sender,
        s.recipient,
        s.token,
        s.deposit.toString(),
        s.withdrawn.toString(),
        s.startTime,
        s.cliffTime,
        s.endTime,
        s.cancelable ? 1 : 0,
        s.status,
        s.createdAt,
        txHash,
        now,
      ],
    });
  }

  async getStream(id: number): Promise<ApiStream | null> {
    const r = await this.client.execute({ sql: 'SELECT * FROM streams WHERE id = ?', args: [id] });
    return r.rows[0] ? rowToStream(r.rows[0] as Row) : null;
  }

  async listStreams(
    opts: { address?: string; role?: 'sender' | 'recipient' | 'any' } = {}
  ): Promise<ApiStream[]> {
    const { address, role = 'any' } = opts;
    let sql: string;
    let args: Array<string> = [];
    if (!address) {
      sql = 'SELECT * FROM streams ORDER BY created_at DESC';
    } else if (role === 'sender') {
      sql = 'SELECT * FROM streams WHERE sender = ? ORDER BY created_at DESC';
      args = [address];
    } else if (role === 'recipient') {
      sql = 'SELECT * FROM streams WHERE recipient = ? ORDER BY created_at DESC';
      args = [address];
    } else {
      sql = 'SELECT * FROM streams WHERE sender = ? OR recipient = ? ORDER BY created_at DESC';
      args = [address, address];
    }
    const r = await this.client.execute({ sql, args });
    return r.rows.map((row) => rowToStream(row as Row));
  }

  async allStreams(): Promise<ApiStream[]> {
    return this.listStreams();
  }

  // --- events ---
  async insertEvent(e: ApiEvent): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO events(type, stream_id, ledger, tx_hash, data, created_at) VALUES(?, ?, ?, ?, ?, ?)',
      args: [e.type, e.streamId, e.ledger, e.txHash, e.data === undefined ? null : JSON.stringify(e.data), e.createdAt],
    });
  }

  async recentEvents(limit = 50): Promise<ApiEvent[]> {
    const r = await this.client.execute({
      sql: 'SELECT * FROM events ORDER BY uid DESC LIMIT ?',
      args: [limit],
    });
    return r.rows.map((row) => {
      const x = row as Row;
      return {
        type: String(x.type),
        streamId: x.stream_id == null ? null : Number(x.stream_id),
        ledger: x.ledger == null ? null : Number(x.ledger),
        txHash: x.tx_hash == null ? null : String(x.tx_hash),
        data: x.data == null ? null : JSON.parse(String(x.data)),
        createdAt: Number(x.created_at),
      };
    });
  }

  async eventExists(txHash: string, type: string): Promise<boolean> {
    const r = await this.client.execute({
      sql: 'SELECT 1 FROM events WHERE tx_hash = ? AND type = ? LIMIT 1',
      args: [txHash, type],
    });
    return r.rows.length > 0;
  }

  // --- feedback ---
  async insertFeedback(f: {
    wallet?: string | null;
    rating?: number | null;
    message: string;
    category?: string | null;
  }): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO feedback(wallet, rating, message, category, created_at) VALUES(?, ?, ?, ?, ?)',
      args: [f.wallet ?? null, f.rating ?? null, f.message, f.category ?? null, Date.now()],
    });
  }

  async feedbackSummary(): Promise<{
    count: number;
    averageRating: number | null;
    recent: FeedbackEntry[];
  }> {
    const agg = await this.client.execute('SELECT COUNT(*) AS count, AVG(rating) AS avg FROM feedback');
    const aggRow = agg.rows[0] as Row;
    const rows = await this.client.execute('SELECT * FROM feedback ORDER BY id DESC LIMIT 20');
    return {
      count: Number(aggRow?.count ?? 0),
      averageRating: aggRow?.avg == null ? null : Number(aggRow.avg),
      recent: rows.rows.map((row) => {
        const x = row as Row;
        return {
          id: Number(x.id),
          wallet: x.wallet == null ? null : String(x.wallet),
          rating: x.rating == null ? null : Number(x.rating),
          message: String(x.message),
          category: x.category == null ? null : String(x.category),
          createdAt: Number(x.created_at),
        };
      }),
    };
  }

  // --- analytics ---
  async insertAnalytics(name: string, wallet: string | null, props: unknown): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO analytics_events(name, wallet, props, created_at) VALUES(?, ?, ?, ?)',
      args: [name, wallet, props === undefined ? null : JSON.stringify(props), Date.now()],
    });
  }

  async analyticsSummary(): Promise<{
    totalEvents: number;
    uniqueWallets: number;
    byName: Array<{ name: string; count: number }>;
  }> {
    const total = await this.client.execute('SELECT COUNT(*) AS c FROM analytics_events');
    const wallets = await this.client.execute(
      'SELECT COUNT(DISTINCT wallet) AS c FROM analytics_events WHERE wallet IS NOT NULL'
    );
    const byName = await this.client.execute(
      'SELECT name, COUNT(*) AS count FROM analytics_events GROUP BY name ORDER BY count DESC'
    );
    return {
      totalEvents: Number((total.rows[0] as Row)?.c ?? 0),
      uniqueWallets: Number((wallets.rows[0] as Row)?.c ?? 0),
      byName: byName.rows.map((row) => {
        const x = row as Row;
        return { name: String(x.name), count: Number(x.count) };
      }),
    };
  }

  // --- webhooks ---
  async addWebhook(url: string, secret: string | null): Promise<number> {
    const info = await this.client.execute({
      sql: 'INSERT INTO webhooks(url, secret, created_at) VALUES(?, ?, ?)',
      args: [url, secret, Date.now()],
    });
    return Number(info.lastInsertRowid ?? 0);
  }

  async listWebhooks(): Promise<Array<{ id: number; url: string; secret: string | null }>> {
    const r = await this.client.execute('SELECT id, url, secret FROM webhooks');
    return r.rows.map((row) => {
      const x = row as Row;
      return { id: Number(x.id), url: String(x.url), secret: x.secret == null ? null : String(x.secret) };
    });
  }
}
