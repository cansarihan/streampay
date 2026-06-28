import express from 'express';
import cors from 'cors';
import type { StreamPayClient } from '@streampay/sdk';
import type { AppConfig } from './config';
import type { Db } from './db';

function computeStats(db: Db) {
  const streams = db.allStreams();
  let totalDeposited = 0n;
  let totalWithdrawn = 0n;
  let valueLocked = 0n;
  let active = 0;
  let completed = 0;
  let canceled = 0;
  const users = new Set<string>();

  for (const s of streams) {
    const deposit = BigInt(s.deposit);
    const withdrawn = BigInt(s.withdrawn);
    totalDeposited += deposit;
    totalWithdrawn += withdrawn;
    users.add(s.sender);
    users.add(s.recipient);
    if (s.status === 1) {
      canceled++;
    } else if (s.status === 2) {
      completed++;
    } else {
      active++;
      valueLocked += deposit - withdrawn;
    }
  }

  return {
    totalStreams: streams.length,
    activeStreams: active,
    completedStreams: completed,
    canceledStreams: canceled,
    uniqueUsers: users.size,
    totalValueLocked: valueLocked.toString(),
    totalDeposited: totalDeposited.toString(),
    totalWithdrawn: totalWithdrawn.toString(),
  };
}

export function createApp(db: Db, client: StreamPayClient, cfg: AppConfig) {
  const app = express();
  app.use(cors({ origin: cfg.corsOrigin }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, network: cfg.network, contractId: cfg.contractId, time: Date.now() });
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      contractId: cfg.contractId,
      rpcUrl: cfg.rpcUrl,
      networkPassphrase: cfg.networkPassphrase,
      network: cfg.network,
    });
  });

  // --- streams ---
  app.get('/api/streams', (req, res) => {
    const address = typeof req.query.address === 'string' ? req.query.address : undefined;
    const roleParam = req.query.role;
    const role =
      roleParam === 'sender' || roleParam === 'recipient' || roleParam === 'any'
        ? roleParam
        : 'any';
    res.json({ streams: db.listStreams({ address, role }) });
  });

  app.get('/api/streams/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0) {
      return res.status(400).json({ error: 'invalid stream id' });
    }
    let stream = db.getStream(id);
    if (!stream) {
      try {
        const fresh = await client.getStream(id);
        db.upsertStream(fresh, null);
        stream = db.getStream(id);
      } catch {
        /* not found on-chain either */
      }
    }
    if (!stream) return res.status(404).json({ error: 'stream not found' });
    return res.json({ stream });
  });

  // --- protocol stats & activity ---
  app.get('/api/stats', (_req, res) => {
    res.json(computeStats(db));
  });

  app.get('/api/activity', (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    res.json({ events: db.recentEvents(limit) });
  });

  // --- feedback ---
  app.post('/api/feedback', (req, res) => {
    const body = req.body ?? {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length === 0) return res.status(400).json({ error: 'message is required' });
    if (message.length > 2000) return res.status(400).json({ error: 'message too long' });
    db.insertFeedback({
      wallet: typeof body.wallet === 'string' ? body.wallet : null,
      rating: typeof body.rating === 'number' ? body.rating : null,
      message,
      category: typeof body.category === 'string' ? body.category : null,
    });
    return res.status(201).json({ ok: true });
  });

  app.get('/api/feedback/summary', (_req, res) => {
    res.json(db.feedbackSummary());
  });

  // --- analytics (server-side fallback + wallet-interaction proof) ---
  app.post('/api/analytics/event', (req, res) => {
    const body = req.body ?? {};
    if (typeof body.name !== 'string' || body.name.length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }
    db.insertAnalytics(
      body.name,
      typeof body.wallet === 'string' ? body.wallet : null,
      body.props ?? null
    );
    return res.status(201).json({ ok: true });
  });

  app.get('/api/analytics/summary', (_req, res) => {
    res.json(db.analyticsSummary());
  });

  // --- webhooks ---
  app.post('/api/webhooks', (req, res) => {
    const body = req.body ?? {};
    if (typeof body.url !== 'string' || !/^https?:\/\//.test(body.url)) {
      return res.status(400).json({ error: 'a valid http(s) url is required' });
    }
    const id = db.addWebhook(body.url, typeof body.secret === 'string' ? body.secret : null);
    return res.status(201).json({ id });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not found' }));

  return app;
}
