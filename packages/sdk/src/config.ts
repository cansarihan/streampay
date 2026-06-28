export const NETWORK_PASSPHRASES = {
  testnet: 'Test SDF Network ; September 2015',
  public: 'Public Global Stellar Network ; September 2015',
} as const;

export const DEFAULT_RPC_URLS = {
  testnet: 'https://soroban-testnet.stellar.org',
  public: 'https://mainnet.sorobanrpc.com',
} as const;

export const HORIZON_URLS = {
  testnet: 'https://horizon-testnet.stellar.org',
  public: 'https://horizon.stellar.org',
} as const;

export type NetworkName = keyof typeof NETWORK_PASSPHRASES;

/** stellar.expert explorer URL for a contract on a given network. */
export function contractExplorerUrl(contractId: string, network: NetworkName = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/contract/${contractId}`;
}

/** stellar.expert explorer URL for a transaction. */
export function txExplorerUrl(hash: string, network: NetworkName = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}
