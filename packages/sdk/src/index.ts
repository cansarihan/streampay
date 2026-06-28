// Client
export { StreamPayClient } from './client';

// Types
export { StreamStatus } from './types';
export type {
  Stream,
  Config,
  CreateStreamParams,
  CancelResult,
  WalletSigner,
  AssetInfo,
  StreamPayClientConfig,
} from './types';

// Client-side stream math (mirrors the on-chain integer math)
export {
  nowSeconds,
  vestedAmount,
  withdrawableAmount,
  remainingAmount,
  flowRatePerSecond,
  streamProgress,
  isCliffReached,
  derivedStatus,
  secondsRemaining,
} from './math';
export type { DerivedStatus } from './math';

// Formatting
export { formatUnits, parseUnits, formatAmount, shortAddress } from './format';

// ScVal encode/decode helpers
export { toAddress, toU64, toI128, toBool, parseStream, parseConfig } from './scval';

// Network config
export {
  NETWORK_PASSPHRASES,
  DEFAULT_RPC_URLS,
  HORIZON_URLS,
  contractExplorerUrl,
  txExplorerUrl,
} from './config';
export type { NetworkName } from './config';
