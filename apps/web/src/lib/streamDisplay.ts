import { useEffect, useState } from 'react';
import type { Stream } from '@streampay/sdk';

/**
 * Display-only vested amount with millisecond resolution so counters visibly stream between the
 * per-second on-chain ticks. Authoritative amounts use the SDK's exact integer math.
 */
export function vestedDisplay(s: Stream, nowMs: number): bigint {
  const startMs = s.startTime * 1000;
  const endMs = s.endTime * 1000;
  const cliffMs = s.cliffTime * 1000;
  if (nowMs < cliffMs) return 0n;
  if (nowMs >= endMs) return s.deposit;
  const elapsed = BigInt(Math.max(0, Math.floor(nowMs - startMs)));
  const duration = BigInt(endMs - startMs);
  if (duration <= 0n) return s.deposit;
  return (s.deposit * elapsed) / duration;
}

/** Live vested amount that ticks on an interval (paused when `live` is false). */
export function useLiveVested(stream: Stream | undefined, live = true, intervalMs = 80): bigint {
  const [value, setValue] = useState<bigint>(() => (stream ? vestedDisplay(stream, Date.now()) : 0n));
  useEffect(() => {
    if (!stream) return;
    setValue(vestedDisplay(stream, Date.now()));
    if (!live) return;
    const timer = setInterval(() => setValue(vestedDisplay(stream, Date.now())), intervalMs);
    return () => clearInterval(timer);
  }, [stream, live, intervalMs]);
  return value;
}
