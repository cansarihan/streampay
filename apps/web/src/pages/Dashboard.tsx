import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, Wallet2 } from 'lucide-react';
import type { Stream } from '@streampay/sdk';
import { flowRatePerSecond, nowSeconds, withdrawableAmount } from '@streampay/sdk';
import { useWallet } from '../lib/wallet';
import { useWalletStreams } from '../lib/queries';
import { XLM } from '../lib/config';
import { formatToken } from '../lib/format';
import { ConnectGate } from '../components/layout/ConnectGate';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StreamCard } from '../components/stream/StreamCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

function isActive(s: Stream, now: number): boolean {
  return s.status === 0 && now < s.endTime && now >= s.cliffTime;
}

export function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your streams at a glance, updating in real time."
        action={
          <Link to="/app/create">
            <Button>
              <Plus className="size-4" /> Create stream
            </Button>
          </Link>
        }
      />
      <ConnectGate message="Connect a Stellar wallet to see the streams flowing to and from you.">
        <DashboardBody />
      </ConnectGate>
    </div>
  );
}

function DashboardBody() {
  const { address } = useWallet();
  const { data, isLoading, isError } = useWalletStreams(address);

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <EmptyState
        title="Couldn’t load your streams"
        description="The network request failed. Check your connection and try again."
      />
    );
  }

  const { incoming, outgoing } = data;
  const now = nowSeconds();
  const withdrawableIn = incoming.reduce((acc, s) => acc + withdrawableAmount(s, now), 0n);
  const rateIn = incoming
    .filter((s) => isActive(s, now))
    .reduce((acc, s) => acc + flowRatePerSecond(s), 0n);
  const lockedOut = outgoing.reduce((acc, s) => acc + (s.deposit - s.withdrawn), 0n);
  const activeOut = outgoing.filter((s) => isActive(s, now)).length;

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={<Wallet2 />}
        title="No streams yet"
        description="Create your first stream to pay someone by the second, or share a request link to get paid."
        action={
          <Link to="/app/create">
            <Button>
              <Plus className="size-4" /> Create a stream
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Streaming in"
          value={`${formatToken(withdrawableIn, XLM.decimals, 4)} XLM`}
          sub="ready to withdraw"
          icon={<ArrowDownLeft />}
        />
        <StatCard
          label="Inbound rate"
          value={<span className="tnum text-positive">+{formatToken(rateIn, XLM.decimals, 6)}</span>}
          sub="XLM / second"
        />
        <StatCard
          label="Streaming out"
          value={`${formatToken(lockedOut, XLM.decimals, 2)} XLM`}
          sub={`${activeOut} active`}
          icon={<ArrowUpRight />}
        />
        <StatCard
          label="Total streams"
          value={incoming.length + outgoing.length}
          sub={`${incoming.length} in · ${outgoing.length} out`}
        />
      </div>

      <StreamSection
        title="Incoming"
        streams={incoming}
        role="recipient"
        emptyLabel="No incoming streams yet."
      />
      <StreamSection
        title="Outgoing"
        streams={outgoing}
        role="sender"
        emptyLabel="You haven’t created any streams yet."
      />
    </div>
  );
}

function StreamSection({
  title,
  streams,
  role,
  emptyLabel,
}: {
  title: string;
  streams: Stream[];
  role: 'sender' | 'recipient';
  emptyLabel: string;
}) {
  const shown = streams.slice(0, 6);
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-fg">
          {title} <span className="text-fg-subtle">({streams.length})</span>
        </h2>
        {streams.length > 6 && (
          <Link to="/app/streams" className="inline-flex items-center gap-1 text-sm text-aqua hover:underline">
            View all <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-fg-subtle">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <StreamCard key={`${role}-${s.id}`} stream={s} role={role} />
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
