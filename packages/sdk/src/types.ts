/** Lifecycle status of a stream — mirrors the on-chain `StreamStatus` enum discriminants. */
export enum StreamStatus {
  Active = 0,
  Canceled = 1,
  Depleted = 2,
}

/** A payment stream, as read from the contract (camelCased, amounts as bigint stroops). */
export interface Stream {
  id: number;
  sender: string;
  recipient: string;
  token: string;
  deposit: bigint;
  withdrawn: bigint;
  startTime: number;
  cliffTime: number;
  endTime: number;
  cancelable: boolean;
  status: StreamStatus;
  createdAt: number;
}

/** Protocol configuration. */
export interface Config {
  admin: string;
  feeBps: number;
  feeCollector: string;
  paused: boolean;
}

/** Inputs for opening a stream. Times are unix seconds; `deposit` is in token base units. */
export interface CreateStreamParams {
  sender: string;
  recipient: string;
  token: string;
  deposit: bigint;
  startTime: number;
  cliffTime: number;
  endTime: number;
  cancelable: boolean;
}

/** Result of a cancel: amount paid to the recipient and amount refunded to the sender. */
export interface CancelResult {
  recipientAmount: bigint;
  refund: bigint;
}

/**
 * A wallet-agnostic signer. Matches the shape returned by Freighter and
 * `@creit.tech/stellar-wallets-kit` (which resolve to `{ signedTxXdr }`).
 */
export interface WalletSigner {
  publicKey: string;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<{ signedTxXdr: string; signerAddress?: string } | string>;
}

/** Metadata describing a streamable asset. */
export interface AssetInfo {
  code: string;
  sac: string;
  decimals: number;
  native: boolean;
  issuer?: string | null;
}

/** Configuration for constructing a {@link StreamPayClient}. */
export interface StreamPayClientConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  /** Optional fee (stroops) for the outer Stellar transaction. Defaults to a safe value. */
  baseFee?: string;
}
