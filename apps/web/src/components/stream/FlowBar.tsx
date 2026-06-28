import { cn } from '../../lib/cn';

/** A progress bar whose filled portion is the signature flowing aqua→violet ribbon. */
export function FlowBar({
  progress,
  active = true,
  className,
}: {
  progress: number;
  active?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-700', active ? 'flow-bar' : 'bg-white/25')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
