import { readFileSync } from 'node:fs';

interface Deployment {
  contractId?: string;
  rpcUrl?: string;
  networkPassphrase?: string;
  network?: string;
}

function loadDeployment(): Deployment {
  try {
    const url = new URL('../../../deployments/testnet.json', import.meta.url);
    return JSON.parse(readFileSync(url, 'utf8')) as Deployment;
  } catch {
    return {};
  }
}

const dep = loadDeployment();

export const config = {
  port: Number(process.env.PORT ?? 8787),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  contractId: process.env.CONTRACT_ID ?? dep.contractId ?? '',
  rpcUrl: process.env.RPC_URL ?? dep.rpcUrl ?? 'https://soroban-testnet.stellar.org',
  networkPassphrase:
    process.env.NETWORK_PASSPHRASE ?? dep.networkPassphrase ?? 'Test SDF Network ; September 2015',
  network: process.env.NETWORK ?? dep.network ?? 'testnet',

  dbPath: process.env.DB_PATH ?? './data/streampay.db',

  indexerEnabled: process.env.INDEXER_ENABLED !== 'false',
  indexerIntervalMs: Number(process.env.INDEXER_INTERVAL_MS ?? 5000),
  indexerLookbackLedgers: Number(process.env.INDEXER_LOOKBACK_LEDGERS ?? 2000),
};

export type AppConfig = typeof config;
