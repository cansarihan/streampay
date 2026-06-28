import { StreamPayClient } from '@streampay/sdk';
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from './config';

/** Shared StreamPay contract client (reads via simulation, writes via a wallet signer). */
export const streamPay = new StreamPayClient({
  contractId: CONTRACT_ID,
  rpcUrl: RPC_URL,
  networkPassphrase: NETWORK_PASSPHRASE,
});
