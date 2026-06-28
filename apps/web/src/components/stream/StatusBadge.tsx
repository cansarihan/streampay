import { derivedStatus, nowSeconds } from '@streampay/sdk';
import type { DerivedStatus, Stream } from '@streampay/sdk';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';

const config: Record<DerivedStatus, { tone: BadgeTone; label: string; live?: boolean }> = {
  streaming: { tone: 'positive', label: 'Streaming', live: true },
  scheduled: { tone: 'aqua', label: 'Scheduled' },
  cliff: { tone: 'cliff', label: 'In cliff' },
  completed: { tone: 'aqua', label: 'Completed' },
  canceled: { tone: 'danger', label: 'Canceled' },
  depleted: { tone: 'neutral', label: 'Depleted' },
};

export function StatusBadge({ stream, at }: { stream: Stream; at?: number }) {
  const status = derivedStatus(stream, at ?? nowSeconds());
  const cfg = config[status];
  return (
    <Badge tone={cfg.tone}>
      {cfg.live && <span className="live-dot" />}
      {cfg.label}
    </Badge>
  );
}
