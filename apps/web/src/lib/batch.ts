import { useCallback, useState } from 'react';
import type { WalletSigner } from '@streampay/sdk';
import { streamPay } from './client';

export interface BatchItem {
  recipient: string;
  deposit: bigint;
}

export interface BatchResult {
  recipient: string;
  id?: number;
  error?: string;
}

export interface BatchProgress {
  total: number;
  done: number;
  failed: number;
  running: boolean;
}

export interface BatchRunOptions {
  signer: WalletSigner;
  sender: string;
  token: string;
  startTime: number;
  cliffTime: number;
  endTime: number;
  cancelable: boolean;
  items: BatchItem[];
}

/**
 * Opens many streams in sequence, one wallet signature each (the contract settles each stream
 * atomically; batching is at the app layer). Surfaces live progress for the UI.
 */
export function useCreateBatch() {
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0,
    done: 0,
    failed: 0,
    running: false,
  });
  const [results, setResults] = useState<BatchResult[]>([]);

  const run = useCallback(async (opts: BatchRunOptions): Promise<BatchResult[]> => {
    const { signer, sender, token, startTime, cliffTime, endTime, cancelable, items } = opts;
    setResults([]);
    setProgress({ total: items.length, done: 0, failed: 0, running: true });
    const collected: BatchResult[] = [];

    for (const item of items) {
      try {
        const id = await streamPay.createStream(
          { sender, recipient: item.recipient, token, deposit: item.deposit, startTime, cliffTime, endTime, cancelable },
          signer
        );
        collected.push({ recipient: item.recipient, id });
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        collected.push({ recipient: item.recipient, error: (err as Error).message });
        setProgress((p) => ({ ...p, failed: p.failed + 1 }));
      }
      setResults([...collected]);
    }

    setProgress((p) => ({ ...p, running: false }));
    return collected;
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setProgress({ total: 0, done: 0, failed: 0, running: false });
  }, []);

  return { run, reset, progress, results };
}
