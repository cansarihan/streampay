import { Address, nativeToScVal } from '@stellar/stellar-sdk';
import type { Config, Stream } from './types';
import { StreamStatus } from './types';

// --- argument encoders ---

export const toAddress = (value: string) => new Address(value).toScVal();
export const toU64 = (value: number | bigint) => nativeToScVal(BigInt(value), { type: 'u64' });
export const toI128 = (value: bigint) => nativeToScVal(value, { type: 'i128' });
export const toBool = (value: boolean) => nativeToScVal(value, { type: 'bool' });

// --- result decoders (the contract returns snake_case structs) ---

interface RawStream {
  id: bigint | number;
  sender: string;
  recipient: string;
  token: string;
  deposit: bigint | number | string;
  withdrawn: bigint | number | string;
  start_time: bigint | number;
  cliff_time: bigint | number;
  end_time: bigint | number;
  cancelable: boolean;
  status: number;
  created_at: bigint | number;
}

export function parseStream(raw: RawStream): Stream {
  return {
    id: Number(raw.id),
    sender: raw.sender,
    recipient: raw.recipient,
    token: raw.token,
    deposit: BigInt(raw.deposit),
    withdrawn: BigInt(raw.withdrawn),
    startTime: Number(raw.start_time),
    cliffTime: Number(raw.cliff_time),
    endTime: Number(raw.end_time),
    cancelable: Boolean(raw.cancelable),
    status: Number(raw.status) as StreamStatus,
    createdAt: Number(raw.created_at),
  };
}

interface RawConfig {
  admin: string;
  fee_bps: number | bigint;
  fee_collector: string;
  paused: boolean;
}

export function parseConfig(raw: RawConfig): Config {
  return {
    admin: raw.admin,
    feeBps: Number(raw.fee_bps),
    feeCollector: raw.fee_collector,
    paused: Boolean(raw.paused),
  };
}
