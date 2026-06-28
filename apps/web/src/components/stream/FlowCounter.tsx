import { useEffect, useState } from 'react';
import type { Stream } from '@streampay/sdk';
import { formatToken } from '../../lib/format';
import { cn } from '../../lib/cn';

/**
 * Display-only vested amount with millisecond resolution so the counter visibly streams between
 * the per-second on-chain ticks. Authoritative amounts (withdrawable, totals) use the SDK's exact
 * integer math; this is purely the animated readout.
 */
function vestedDisplay(s: Stream, nowMs: number): bigint {
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

export function FlowCounter({
  stream,
  decimals,
  displayDecimals = 7,
  live = true,
  intervalMs = 60,
  className,
}: {
  stream: Stream;
  decimals: number;
  displayDecimals?: number;
  live?: boolean;
  intervalMs?: number;
  className?: string;
}) {
  const [value, setValue] = useState(() => vestedDisplay(stream, Date.now()));

  useEffect(() => {
    setValue(vestedDisplay(stream, Date.now()));
    if (!live) return;
    const timer = setInterval(() => setValue(vestedDisplay(stream, Date.now())), intervalMs);
    return () => clearInterval(timer);
  }, [stream, live, intervalMs]);

  return <span className={cn('tnum', className)}>{formatToken(value, decimals, displayDecimals)}</span>;
}
