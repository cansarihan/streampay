import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Stream } from '@streampay/sdk';
import { useWallet } from '../lib/wallet';
import { useWalletStreams } from '../lib/queries';
import { cn } from '../lib/cn';
import { ConnectGate } from '../components/layout/ConnectGate';
import { PageHeader } from '../components/layout/PageHeader';
import { StreamCard } from '../components/stream/StreamCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

type Tab = 'all' | 'incoming' | 'outgoing';
type Item = { stream: Stream; role: 'sender' | 'recipient' };

export function Streams() {
  return (
    <div>
      <PageHeader
        title="Streams"
        subtitle="Every stream flowing to and from your wallet."
        action={
          <Link to="/app/create">
            <Button>
              <Plus className="size-4" /> Create stream
            </Button>
          </Link>
        }
      />
      <ConnectGate>
        <StreamsBody />
      </ConnectGate>
    </div>
  );
}

function StreamsBody() {
  const { address } = useWallet();
  const { data, isLoading, isError } = useWalletStreams(address);
  const [tab, setTab] = useState<Tab>('all');

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Couldn’t load your streams" description="Please try again." />;
  }

  const { incoming, outgoing } = data;
  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: incoming.length + outgoing.length },
    { key: 'incoming', label: 'Incoming', count: incoming.length },
    { key: 'outgoing', label: 'Outgoing', count: outgoing.length },
  ];

  const items: Item[] =
    tab === 'incoming'
      ? incoming.map((s) => ({ stream: s, role: 'recipient' }))
      : tab === 'outgoing'
        ? outgoing.map((s) => ({ stream: s, role: 'sender' }))
        : [
            ...incoming.map((s): Item => ({ stream: s, role: 'recipient' })),
            ...outgoing.map((s): Item => ({ stream: s, role: 'sender' })),
          ].sort((a, b) => b.stream.createdAt - a.stream.createdAt);

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border border-white/8 bg-ink-900/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition',
              tab === t.key ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'
            )}
          >
            {t.label} <span className="text-fg-subtle">{t.count}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Streams you create or receive will show up in this list."
          action={
            <Link to="/app/create">
              <Button>
                <Plus className="size-4" /> Create a stream
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StreamCard key={`${item.role}-${item.stream.id}`} stream={item.stream} role={item.role} />
          ))}
        </div>
      )}
    </div>
  );
}
