import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownLeft, Ban, CircleDot, Users, Wallet } from 'lucide-react';
import type { ActivityEvent } from '../lib/api';
import { useActivity, useAnalyticsSummary, useFeedbackSummary, useProtocolStats } from '../lib/queries';
import { NETWORK } from '../lib/config';
import { formatToken, relativeTime, shortAddress } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';

const eventMeta: Record<string, { label: string; tone: 'positive' | 'aqua' | 'danger' | 'neutral' }> = {
  created: { label: 'Stream created', tone: 'aqua' },
  withdraw: { label: 'Withdrawal', tone: 'positive' },
  cancel: { label: 'Canceled', tone: 'danger' },
  paused: { label: 'Paused', tone: 'neutral' },
};

const xlm = (raw: string) => `${formatToken(BigInt(raw), 7, 2)} XLM`;

export function Analytics() {
  const stats = useProtocolStats();
  const activity = useActivity(25);
  const analytics = useAnalyticsSummary();
  const feedback = useFeedbackSummary();

  const offline = stats.isError;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Protocol-wide usage, indexed from the contract and the app’s own event stream."
      />

      {offline ? (
        <Card className="border-cliff/30 bg-cliff/5">
          <p className="text-sm text-fg">
            The analytics service is offline. Start the API (<code className="text-aqua">npm run dev:api</code>)
            to see protocol stats, activity and feedback. Your streams still work directly against the
            contract.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stat grid */}
          {stats.isLoading || !stats.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Total streams" value={stats.data.totalStreams} icon={<Activity />} />
              <StatCard label="Active" value={stats.data.activeStreams} icon={<CircleDot />} />
              <StatCard label="Value locked" value={xlm(stats.data.totalValueLocked)} icon={<Wallet />} />
              <StatCard label="Streamed out" value={xlm(stats.data.totalWithdrawn)} icon={<ArrowDownLeft />} />
              <StatCard label="Unique users" value={stats.data.uniqueUsers} icon={<Users />} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Events by type */}
            <Card>
              <CardLabel>App events</CardLabel>
              <p className="mt-1 text-xs text-fg-subtle">
                {analytics.data
                  ? `${analytics.data.totalEvents} events · ${analytics.data.uniqueWallets} wallets`
                  : 'tracked wallet interactions'}
              </p>
              <div className="mt-4 h-56">
                {analytics.data && analytics.data.byName.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.data.byName} layout="vertical" margin={{ left: 24, right: 12 }}>
                      <XAxis type="number" tick={{ fill: '#5C6890', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: '#93A0C4', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ background: '#0A1024', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E8EEFF' }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {analytics.data.byName.map((_, i) => (
                          <Cell key={i} fill="#1FE3D0" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
                    No events tracked yet.
                  </div>
                )}
              </div>
            </Card>

            {/* Feedback */}
            <Card>
              <div className="flex items-center justify-between">
                <CardLabel>User feedback</CardLabel>
                {feedback.data && (
                  <Badge tone="aqua">
                    {feedback.data.count} · avg{' '}
                    {feedback.data.averageRating ? feedback.data.averageRating.toFixed(1) : '—'}
                  </Badge>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {feedback.data && feedback.data.recent.length > 0 ? (
                  feedback.data.recent.slice(0, 5).map((f) => (
                    <div key={f.id} className="rounded-xl border border-white/8 p-3 text-sm">
                      <p className="text-fg">{f.message}</p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {f.rating ? `★ ${f.rating} · ` : ''}
                        {f.wallet ? shortAddress(f.wallet) : 'anonymous'} · {relativeTime(f.createdAt / 1000)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-fg-subtle">
                    No feedback yet.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Activity feed */}
          <Card>
            <CardLabel>Recent activity</CardLabel>
            <div className="mt-4 space-y-1">
              {activity.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)
              ) : activity.data && activity.data.events.length > 0 ? (
                activity.data.events.map((ev, i) => <ActivityRow key={i} event={ev} />)
              ) : (
                <p className="py-8 text-center text-sm text-fg-subtle">No on-chain activity indexed yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const meta = eventMeta[event.type] ?? { label: event.type, tone: 'neutral' as const };
  const Icon = event.type === 'cancel' ? Ban : event.type === 'withdraw' ? ArrowDownLeft : Activity;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-fg-muted">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm text-fg">
            {meta.label}
            {event.streamId !== null ? ` · Stream #${event.streamId}` : ''}
          </p>
          <p className="text-xs text-fg-subtle">
            {event.ledger ? `ledger ${event.ledger} · ` : ''}
            {relativeTime(event.createdAt / 1000)}
          </p>
        </div>
      </div>
      {event.txHash && (
        <a
          href={`https://stellar.expert/explorer/${NETWORK}/tx/${event.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-aqua hover:underline"
        >
          tx
        </a>
      )}
    </div>
  );
}
