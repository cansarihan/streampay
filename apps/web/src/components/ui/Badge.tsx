import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'aqua' | 'violet' | 'positive' | 'cliff' | 'danger' | 'neutral';

const tones: Record<BadgeTone, string> = {
  aqua: 'bg-aqua/15 text-aqua border-aqua/30',
  violet: 'bg-violet/15 text-violet border-violet/30',
  positive: 'bg-positive/15 text-positive border-positive/30',
  cliff: 'bg-cliff/15 text-cliff border-cliff/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-white/8 text-fg-muted border-white/12',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
