import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Stream } from '@streampay/sdk';
import { flowRatePerSecond, nowSeconds, secondsRemaining, streamProgress } from '@streampay/sdk';
import { assetBySac } from '../../lib/config';
import { formatDuration, formatToken, shortAddress } from '../../lib/format';
import { cn } from '../../lib/cn';
import { FlowCounter } from './FlowCounter';
import { FlowBar } from './FlowBar';
import { StatusBadge } from './StatusBadge';

export function StreamCard({ stream, role }: { stream: Stream; role: 'sender' | 'recipient' }) {
  const asset = assetBySac(stream.token);
  const now = nowSeconds();
  const progress = streamProgress(stream, now);
  const rate = flowRatePerSecond(stream);
  const remaining = secondsRemaining(stream, now);
  const counterparty = role === 'sender' ? stream.recipient : stream.sender;
  const isOut = role === 'sender';
  const active = stream.status === 0 && now < stream.endTime && now >= stream.cliffTime;

  return (
    <Link
      to={`/app/stream/${stream.id}`}
      className="block glass p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-xl',
              isOut ? 'bg-violet/15 text-violet' : 'bg-aqua/15 text-aqua'
            )}
          >
            {isOut ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
          </span>
          <div>
            <p className="text-sm font-medium text-fg">
              {isOut ? 'To' : 'From'} {shortAddress(counterparty)}
            </p>
            <p className="text-xs text-fg-subtle">
              Stream #{stream.id} · {asset.code}
            </p>
          </div>
        </div>
        <StatusBadge stream={stream} />
      </div>

      <div className="mt-4">
        <p className="text-xs text-fg-subtle">{isOut ? 'Streamed' : 'Streamed to you'}</p>
        <p className="mt-0.5 font-display text-2xl text-fg">
          <FlowCounter
            stream={stream}
            decimals={asset.decimals}
            displayDecimals={asset.decimals}
            live={active}
          />
          <span className="ml-1.5 text-sm text-fg-subtle">
            / {formatToken(stream.deposit, asset.decimals, 2)} {asset.code}
          </span>
        </p>
      </div>

      <FlowBar progress={progress} active={active} className="mt-3" />

      <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
        <span className="tnum text-aqua">+{formatToken(rate, asset.decimals, asset.decimals)}/s</span>
        <span>
          {active
            ? `${formatDuration(remaining)} left`
            : stream.status === 1
              ? 'Canceled'
              : progress >= 1
                ? 'Completed'
                : '—'}
        </span>
      </div>
    </Link>
  );
}
