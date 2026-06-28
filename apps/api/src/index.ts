import { StreamPayClient } from '@streampay/sdk';
import { config } from './config';
import { Db } from './db';
import { Indexer } from './indexer';
import { createApp } from './server';

const db = await Db.create(config.dbUrl, config.dbAuthToken);

const client = new StreamPayClient({
  contractId: config.contractId,
  rpcUrl: config.rpcUrl,
  networkPassphrase: config.networkPassphrase,
});

const app = createApp(db, client, config);

const server = app.listen(config.port, () => {
  console.log(`[api] StreamPay API listening on http://localhost:${config.port}`);
  console.log(`[api] network=${config.network} contract=${config.contractId || '(unset)'}`);
});

let indexer: Indexer | null = null;
if (config.indexerEnabled && config.contractId) {
  indexer = new Indexer(client, db, config);
  indexer.start().catch((err) => console.warn('[indexer] failed to start:', err.message));
} else {
  console.log('[indexer] disabled (no contract id or INDEXER_ENABLED=false)');
}

function shutdown() {
  console.log('\n[api] shutting down…');
  indexer?.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
