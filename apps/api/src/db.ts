import { DatabaseSync } from 'node:sqlite';
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

interface StreamRow {
  id: number;
  sender: string;
  recipient: string;
  token: string;
  deposit: string;
  withdrawn: string;
  start_time: number;
  cliff_time: number;
  end_time: number;
  cancelable: number;
  status: number;
  created_at: number;
  tx_hash: string | null;
  updated_at: number;
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

function rowToStream(r: StreamRow): ApiStream {
  return {
    id: r.id,
    sender: r.sender,
    recipient: r.recipient,
    token: r.token,
    deposit: r.deposit,
    withdrawn: r.withdrawn,
    startTime: r.start_time,
    cliffTime: r.cliff_time,
    endTime: r.end_time,
    cancelable: r.cancelable === 1,
    status: r.status,
    createdAt: r.created_at,
    txHash: r.tx_hash,
    updatedAt: r.updated_at,
  };
}

export class Db {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec(SCHEMA);
  }

  // --- meta / cursor ---
  getMeta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }
  setMeta(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
      .run(key, value, value);
  }

  // --- streams ---
  upsertStream(s: Stream, txHash: string | null, now = Date.now()): void {
    this.db
      .prepare(
        `INSERT INTO streams
          (id, sender, recipient, token, deposit, withdrawn, start_time, cliff_time, end_time, cancelable, status, created_at, tx_hash, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           withdrawn = excluded.withdrawn,
           status = excluded.status,
           tx_hash = COALESCE(excluded.tx_hash, streams.tx_hash),
           updated_at = excluded.updated_at`
      )
      .run(
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
        now
      );
  }

  getStream(id: number): ApiStream | null {
    const row = this.db.prepare('SELECT * FROM streams WHERE id = ?').get(id) as
      | StreamRow
      | undefined;
    return row ? rowToStream(row) : null;
  }

  listStreams(opts: { address?: string; role?: 'sender' | 'recipient' | 'any' } = {}): ApiStream[] {
    const { address, role = 'any' } = opts;
    let rows: StreamRow[];
    if (!address) {
      rows = this.db.prepare('SELECT * FROM streams ORDER BY created_at DESC').all() as unknown as StreamRow[];
    } else if (role === 'sender') {
      rows = this.db
        .prepare('SELECT * FROM streams WHERE sender = ? ORDER BY created_at DESC')
        .all(address) as unknown as StreamRow[];
    } else if (role === 'recipient') {
      rows = this.db
        .prepare('SELECT * FROM streams WHERE recipient = ? ORDER BY created_at DESC')
        .all(address) as unknown as StreamRow[];
    } else {
      rows = this.db
        .prepare(
          'SELECT * FROM streams WHERE sender = ? OR recipient = ? ORDER BY created_at DESC'
        )
        .all(address, address) as unknown as StreamRow[];
    }
    return rows.map(rowToStream);
  }

  allStreams(): ApiStream[] {
    return this.listStreams();
  }

  // --- events ---
  insertEvent(e: ApiEvent): void {
    this.db
      .prepare(
        'INSERT INTO events(type, stream_id, ledger, tx_hash, data, created_at) VALUES(?, ?, ?, ?, ?, ?)'
      )
      .run(
        e.type,
        e.streamId,
        e.ledger,
        e.txHash,
        e.data === undefined ? null : JSON.stringify(e.data),
        e.createdAt
      );
  }

  recentEvents(limit = 50): ApiEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM events ORDER BY uid DESC LIMIT ?')
      .all(limit) as Array<{
      type: string;
      stream_id: number | null;
      ledger: number | null;
      tx_hash: string | null;
      data: string | null;
      created_at: number;
    }>;
    return rows.map((r) => ({
      type: r.type,
      streamId: r.stream_id,
      ledger: r.ledger,
      txHash: r.tx_hash,
      data: r.data ? JSON.parse(r.data) : null,
      createdAt: r.created_at,
    }));
  }

  eventExists(txHash: string, type: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM events WHERE tx_hash = ? AND type = ? LIMIT 1')
      .get(txHash, type);
    return !!row;
  }

  // --- feedback ---
  insertFeedback(f: {
    wallet?: string | null;
    rating?: number | null;
    message: string;
    category?: string | null;
  }): void {
    this.db
      .prepare('INSERT INTO feedback(wallet, rating, message, category, created_at) VALUES(?, ?, ?, ?, ?)')
      .run(f.wallet ?? null, f.rating ?? null, f.message, f.category ?? null, Date.now());
  }

  feedbackSummary(): {
    count: number;
    averageRating: number | null;
    recent: FeedbackEntry[];
  } {
    const agg = this.db
      .prepare('SELECT COUNT(*) AS count, AVG(rating) AS avg FROM feedback')
      .get() as { count: number; avg: number | null };
    const rows = this.db
      .prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 20')
      .all() as Array<{
      id: number;
      wallet: string | null;
      rating: number | null;
      message: string;
      category: string | null;
      created_at: number;
    }>;
    return {
      count: agg.count,
      averageRating: agg.avg,
      recent: rows.map((r) => ({
        id: r.id,
        wallet: r.wallet,
        rating: r.rating,
        message: r.message,
        category: r.category,
        createdAt: r.created_at,
      })),
    };
  }

  // --- analytics ---
  insertAnalytics(name: string, wallet: string | null, props: unknown): void {
    this.db
      .prepare('INSERT INTO analytics_events(name, wallet, props, created_at) VALUES(?, ?, ?, ?)')
      .run(name, wallet, props === undefined ? null : JSON.stringify(props), Date.now());
  }

  analyticsSummary(): {
    totalEvents: number;
    uniqueWallets: number;
    byName: Array<{ name: string; count: number }>;
  } {
    const total = this.db.prepare('SELECT COUNT(*) AS c FROM analytics_events').get() as {
      c: number;
    };
    const wallets = this.db
      .prepare('SELECT COUNT(DISTINCT wallet) AS c FROM analytics_events WHERE wallet IS NOT NULL')
      .get() as { c: number };
    const byName = this.db
      .prepare('SELECT name, COUNT(*) AS count FROM analytics_events GROUP BY name ORDER BY count DESC')
      .all() as Array<{ name: string; count: number }>;
    return { totalEvents: total.c, uniqueWallets: wallets.c, byName };
  }

  // --- webhooks ---
  addWebhook(url: string, secret: string | null): number {
    const info = this.db
      .prepare('INSERT INTO webhooks(url, secret, created_at) VALUES(?, ?, ?)')
      .run(url, secret, Date.now());
    return Number(info.lastInsertRowid);
  }

  listWebhooks(): Array<{ id: number; url: string; secret: string | null }> {
    return this.db.prepare('SELECT id, url, secret FROM webhooks').all() as Array<{
      id: number;
      url: string;
      secret: string | null;
    }>;
  }
}
