import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { nowSeconds } from '@streampay/sdk';
import { streamPay } from '../lib/client';
import { useWallet } from '../lib/wallet';
import { decodeRequest } from '../lib/requests';
import { XLM } from '../lib/config';
import { formatDuration, parseUnits } from '../lib/format';
import { track } from '../lib/analytics';
import { Logo } from '../components/layout/Logo';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { AddressChip } from '../components/stream/AddressChip';

export function RequestPublic() {
  const { token } = useParams();
  const request = token ? decodeRequest(token) : null;
  const { address, signer, connect, connecting } = useWallet();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const asset = XLM;

  const fund = useMutation({
    mutationFn: async () => {
      if (!signer || !address) throw new Error('Connect a wallet first');
      if (!request) throw new Error('Invalid request');
      const now = nowSeconds();
      return streamPay.createStream(
        {
          sender: address,
          recipient: request.recipient,
          token: asset.sac,
          deposit: parseUnits(request.amount, asset.decimals),
          startTime: now,
          cliffTime: now + (request.cliffSeconds ?? 0),
          endTime: now + request.durationSeconds,
          cancelable: true,
        },
        signer
      );
    },
    onSuccess: (id) => {
      track('request_funded', { id });
      void queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream funded', { description: `Stream #${id} is now live.` });
      navigate(`/app/stream/${id}`);
    },
    onError: (err: Error) => toast.error('Could not fund the stream', { description: err.message }),
  });

  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/app" className="text-sm text-fg-muted transition hover:text-fg">
            Open app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12">
        {!request ? (
          <EmptyState
            title="Invalid request link"
            description="This payment request couldn’t be read. Ask the sender for a fresh link."
          />
        ) : (
          <Card>
            <CardLabel>Payment request</CardLabel>
            <p className="mt-3 font-display text-4xl text-fg">
              <span className="tnum">{request.amount}</span>{' '}
              <span className="text-lg text-fg-subtle">{request.assetCode}</span>
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              streamed over {formatDuration(request.durationSeconds)}
            </p>

            {request.note && (
              <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-fg">{request.note}</p>
            )}

            <div className="mt-5 border-t border-white/8 pt-4">
              <CardLabel>Streams to</CardLabel>
              <div className="mt-1.5">
                <AddressChip address={request.recipient} />
              </div>
            </div>

            <div className="mt-6">
              {!address ? (
                <Button className="w-full" onClick={connect} loading={connecting}>
                  Connect wallet to pay
                </Button>
              ) : (
                <Button className="w-full" loading={fund.isPending} onClick={() => fund.mutate()}>
                  Fund this stream <ArrowRight className="size-4" />
                </Button>
              )}
              <p className="mt-2 text-center text-xs text-fg-subtle">
                You’ll escrow {request.amount} {request.assetCode}; it streams to the recipient and you
                can cancel the unstreamed remainder anytime.
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
