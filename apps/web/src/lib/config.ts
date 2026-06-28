import { DEFAULT_RPC_URLS, NETWORK_PASSPHRASES } from '@streampay/sdk';
import type { AssetInfo, NetworkName } from '@streampay/sdk';

const env = import.meta.env;

export const CONTRACT_ID =
  env.VITE_CONTRACT_ID ?? 'CCFKV5HTRL33DCWURXES7IX6JR2MWSFW4LSC7UVTWONUPOGANAPETLHT';
export const RPC_URL = env.VITE_RPC_URL ?? DEFAULT_RPC_URLS.testnet;
export const NETWORK: NetworkName = (env.VITE_NETWORK as NetworkName) ?? 'testnet';
export const NETWORK_PASSPHRASE = env.VITE_NETWORK_PASSPHRASE ?? NETWORK_PASSPHRASES.testnet;
export const API_URL = env.VITE_API_URL ?? 'http://localhost:8787';

/** Assets streamable in the UI. XLM is frictionless on testnet (every account is funded). */
export const XLM: AssetInfo = {
  code: 'XLM',
  sac: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  decimals: 7,
  native: true,
  issuer: null,
};

export const ASSETS: AssetInfo[] = [XLM];

export function assetBySac(sac: string): AssetInfo {
  return ASSETS.find((a) => a.sac === sac) ?? { code: 'TOKEN', sac, decimals: 7, native: false };
}

export function assetByCode(code: string): AssetInfo | undefined {
  return ASSETS.find((a) => a.code === code);
}
