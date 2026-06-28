import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '../../lib/cn';

export function StatCard({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-fg-subtle">{label}</p>
        {icon && <span className="text-fg-subtle [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-2 font-display text-2xl text-fg">{value}</div>
      {sub && <div className="mt-1 text-xs text-fg-muted">{sub}</div>}
    </Card>
  );
}
