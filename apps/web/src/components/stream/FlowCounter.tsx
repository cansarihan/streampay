import type { Stream } from '@streampay/sdk';
import { useLiveVested } from '../../lib/streamDisplay';
import { formatToken } from '../../lib/format';
import { cn } from '../../lib/cn';

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
  const value = useLiveVested(stream, live, intervalMs);
  return <span className={cn('tnum', className)}>{formatToken(value, decimals, displayDecimals)}</span>;
}
