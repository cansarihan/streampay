import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowLeft, Ban, Share2 } from 'lucide-react';
import type { Stream } from '@streampay/sdk';
import {
  flowRatePerSecond,
  nowSeconds,
  streamProgress,
  withdrawableAmount,
} from '@streampay/sdk';
import { streamPay } from '../lib/client';
import { useStream } from '../lib/queries';
import { useWallet } from '../lib/wallet';
import { useLiveVested } from '../lib/streamDisplay';
import { track } from '../lib/analytics';
import { assetBySac } from '../lib/config';
import { formatDateTime, formatDuration, formatToken } from '../lib/format';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { CopyButton } from '../components/ui/CopyButton';
import { FlowBar } from '../components/stream/FlowBar';
import { StatusBadge } from '../components/stream/StatusBadge';
import { AddressChip } from '../components/stream/AddressChip';

export function StreamDetail() {
  const { id } = useParams();
  const streamId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;
  const { data: stream, isLoading, isError } = useStream(streamId);

  return (
    <div>
      <Link
        to="/app/streams"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back to streams
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : isError || !stream ? (
        <EmptyState
          title="Stream not found"
          description="This stream doesn’t exist or couldn’t be loaded from the contract."
        />
      ) : (
        <StreamDetailBody stream={stream} streamId={streamId as number} />
      )}
    </div>
  );
}

function StreamDetailBody({ stream, streamId }: { stream: Stream; streamId: number }) {
  const { address, signer, connect } = useWallet();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const asset = assetBySac(stream.token);
  const now = nowSeconds();
  const vested = useLiveVested(stream, stream.status === 0);
  const withdrawableExact = withdrawableAmount(stream, now);
  const withdrawableLive = vested > stream.withdrawn ? vested - stream.withdrawn : 0n;
  const progress = streamProgress(stream, now);
  const rate = flowRatePerSecond(stream);
  const refund = stream.deposit - stream.withdrawn - withdrawableExact;

  const isSender = address === stream.sender;
  const isRecipient = address === stream.recipient;
  const active = stream.status === 0;
  const canWithdraw = isRecipient && active && withdrawableExact > 0n;
  const canCancel = isSender && active && stream.cancelable;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    void queryClient.invalidateQueries({ queryKey: ['streams'] });
  };

  const withdraw = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('Connect a wallet first');
      return streamPay.withdrawMax(streamId, signer);
    },
    onSuccess: (net) => {
      track('stream_withdraw', { id: streamId });
      toast.success('Withdrawn', {
        description: `${formatToken(net, asset.decimals, asset.decimals)} ${asset.code} sent to you.`,
      });
      refresh();
    },
    onError: (err: Error) => toast.error('Withdraw failed', { description: err.message }),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('Connect a wallet first');
      return streamPay.cancel(streamId, signer);
    },
    onSuccess: () => {
      track('stream_cancel', { id: streamId });
      toast.success('Stream canceled', { description: 'Vested funds paid out, remainder refunded.' });
      setCancelOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.error('Cancel failed', { description: err.message }),
  });

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl text-fg">Stream #{stream.id}</h1>
            <StatusBadge stream={stream} />
          </div>
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Share2 className="size-4" />
            Share
            <CopyButton value={`${window.location.origin}${import.meta.env.BASE_URL}app/stream/${stream.id}`} />
          </div>
        </div>

        <div className="mt-6">
          <CardLabel>Streamed so far</CardLabel>
          <p className="mt-1 font-display text-4xl text-fg sm:text-5xl">
            <span className="tnum">{formatToken(vested, asset.decimals, asset.decimals)}</span>
            <span className="ml-2 text-lg text-fg-subtle">
              / {formatToken(stream.deposit, asset.decimals, 2)} {asset.code}
            </span>
          </p>
        </div>

        <FlowBar progress={progress} active={active} className="mt-5 h-2.5" />
        <div className="mt-3 flex items-center justify-between text-sm text-fg-muted">
          <span className="tnum text-aqua">+{formatToken(rate, asset.decimals, asset.decimals)} {asset.code}/s</span>
          <span>{Math.round(progress * 100)}% streamed</span>
        </div>
      </Card>

      {/* Actions */}
      {(isRecipient || isSender) && active && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardLabel>{isRecipient ? 'Available to withdraw' : 'Your reclaimable remainder'}</CardLabel>
            <p className="mt-1 font-display text-2xl text-fg">
              <span className="tnum">
                {formatToken(isRecipient ? withdrawableLive : refund, asset.decimals, asset.decimals)}
              </span>{' '}
              <span className="text-sm text-fg-subtle">{asset.code}</span>
            </p>
          </div>
          <div className="flex gap-3">
            {isRecipient && (
              <Button
                onClick={() => (signer ? withdraw.mutate() : connect())}
                disabled={!!signer && !canWithdraw}
                loading={withdraw.isPending}
              >
                <ArrowDownToLine className="size-4" /> Withdraw
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => setCancelOpen(true)} loading={cancel.isPending}>
                <Ban className="size-4" /> Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Parties + schedule */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardLabel>Parties</CardLabel>
          <Detail label="From (sender)">
            <AddressChip address={stream.sender} />
          </Detail>
          <Detail label="To (recipient)">
            <AddressChip address={stream.recipient} />
          </Detail>
          <Detail label="Asset">
            <span className="text-fg">{asset.code}</span>
          </Detail>
        </Card>

        <Card className="space-y-4">
          <CardLabel>Schedule</CardLabel>
          <Detail label="Starts">{formatDateTime(stream.startTime)}</Detail>
          <Detail label="Cliff">
            {stream.cliffTime > stream.startTime ? formatDateTime(stream.cliffTime) : 'None'}
          </Detail>
          <Detail label="Ends">
            {formatDateTime(stream.endTime)}{' '}
            <span className="text-fg-subtle">({formatDuration(stream.endTime - stream.startTime)})</span>
          </Detail>
          <Detail label="Cancelable">{stream.cancelable ? 'Yes' : 'No'}</Detail>
        </Card>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this stream?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep streaming
            </Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              Cancel stream
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          The recipient keeps everything vested so far; you’re refunded the rest.
        </p>
        <div className="mt-4 space-y-2 rounded-xl border border-white/8 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-fg-subtle">Recipient keeps</span>
            <span className="tnum text-fg">
              {formatToken(withdrawableExact, asset.decimals, 4)} {asset.code}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-subtle">Refunded to you</span>
            <span className="tnum text-fg">
              {formatToken(refund > 0n ? refund : 0n, asset.decimals, 4)} {asset.code}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-fg-subtle">{label}</span>
      <span className="text-right text-fg">{children}</span>
    </div>
  );
}
