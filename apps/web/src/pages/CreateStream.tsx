import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Info } from 'lucide-react';
import { StrKey } from '@stellar/stellar-sdk';
import type { CreateStreamParams } from '@streampay/sdk';
import { nowSeconds } from '@streampay/sdk';
import { streamPay } from '../lib/client';
import { useWallet } from '../lib/wallet';
import { track } from '../lib/analytics';
import { XLM } from '../lib/config';
import { formatToken, parseUnits } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { Toggle } from '../components/ui/Toggle';

const DURATIONS: Record<string, { label: string; seconds: number }> = {
  '1h': { label: '1 hour', seconds: 3600 },
  '1d': { label: '1 day', seconds: 86_400 },
  '1w': { label: '1 week', seconds: 604_800 },
  '30d': { label: '30 days', seconds: 2_592_000 },
  '90d': { label: '90 days', seconds: 7_776_000 },
  '1y': { label: '1 year', seconds: 31_536_000 },
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Computed {
  error?: string;
  params?: CreateStreamParams;
  rate?: bigint;
  start?: number;
  end?: number;
  cliff?: number;
}

export function CreateStream() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { address, signer, connect, connecting } = useWallet();

  const asset = XLM;
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now');
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date(Date.now() + 3600_000)));
  const [durationKey, setDurationKey] = useState<string>('30d');
  const [endAt, setEndAt] = useState(() => toLocalInput(new Date(Date.now() + 30 * 86_400_000)));
  const [hasCliff, setHasCliff] = useState(false);
  const [cliffAt, setCliffAt] = useState(() => toLocalInput(new Date(Date.now() + 7 * 86_400_000)));
  const [cancelable, setCancelable] = useState(true);

  function compute(): Computed {
    if (!StrKey.isValidEd25519PublicKey(recipient.trim())) {
      return { error: 'Enter a valid Stellar address (G…)' };
    }
    const amt = amount.trim();
    if (!amt || Number(amt) <= 0 || Number.isNaN(Number(amt))) {
      return { error: 'Enter an amount greater than zero' };
    }
    const deposit = parseUnits(amt, asset.decimals);
    if (deposit <= 0n) return { error: 'Amount is too small' };

    const now = nowSeconds();
    const start =
      startMode === 'now' ? now : Math.floor(new Date(startAt).getTime() / 1000);
    if (Number.isNaN(start)) return { error: 'Pick a valid start time' };

    const end =
      durationKey === 'custom'
        ? Math.floor(new Date(endAt).getTime() / 1000)
        : start + (DURATIONS[durationKey]?.seconds ?? 0);
    if (Number.isNaN(end)) return { error: 'Pick a valid end time' };
    if (end <= start) return { error: 'End must be after start' };
    if (end - start < 60) return { error: 'A stream must last at least a minute' };
    if (end <= now) return { error: 'End time must be in the future' };

    let cliff = start;
    if (hasCliff) {
      cliff = Math.floor(new Date(cliffAt).getTime() / 1000);
      if (Number.isNaN(cliff)) return { error: 'Pick a valid cliff time' };
      if (cliff < start || cliff > end) return { error: 'Cliff must fall within the stream window' };
    }

    const params: CreateStreamParams = {
      sender: address ?? '',
      recipient: recipient.trim(),
      token: asset.sac,
      deposit,
      startTime: start,
      cliffTime: cliff,
      endTime: end,
      cancelable,
    };
    return { params, rate: deposit / BigInt(end - start), start, end, cliff };
  }

  const computed = compute();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('Connect a wallet first');
      if (!computed.params) throw new Error(computed.error ?? 'Invalid stream');
      return streamPay.createStream(computed.params, signer);
    },
    onSuccess: (id) => {
      track('stream_created', { id, amount });
      void queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream created', { description: `Stream #${id} is now live.` });
      navigate(`/app/stream/${id}`);
    },
    onError: (err: Error) => toast.error('Could not create stream', { description: err.message }),
  });

  return (
    <div>
      <PageHeader
        title="Create a stream"
        subtitle="Escrow an amount and let it vest to the recipient, second by second."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Form */}
        <Card className="space-y-5">
          <Field label="Recipient" hint="The Stellar account that will receive the stream.">
            <Input
              placeholder="G…"
              value={recipient}
              spellCheck={false}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Amount">
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Asset">
              <Select value={asset.code} disabled>
                <option>{asset.code}</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts">
              <Select value={startMode} onChange={(e) => setStartMode(e.target.value as 'now' | 'scheduled')}>
                <option value="now">Now</option>
                <option value="scheduled">Scheduled</option>
              </Select>
            </Field>
            {startMode === 'scheduled' && (
              <Field label="Start time">
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </Field>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Duration">
              <Select value={durationKey} onChange={(e) => setDurationKey(e.target.value)}>
                {Object.entries(DURATIONS).map(([key, d]) => (
                  <option key={key} value={key}>
                    {d.label}
                  </option>
                ))}
                <option value="custom">Custom end date</option>
              </Select>
            </Field>
            {durationKey === 'custom' && (
              <Field label="End time">
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </Field>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-fg">Add a cliff</p>
              <p className="text-xs text-fg-subtle">Nothing is withdrawable until the cliff (for vesting).</p>
            </div>
            <Toggle checked={hasCliff} onChange={setHasCliff} label="Add a cliff" />
          </div>
          {hasCliff && (
            <Field label="Cliff time">
              <Input type="datetime-local" value={cliffAt} onChange={(e) => setCliffAt(e.target.value)} />
            </Field>
          )}

          <div className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-fg">Cancelable</p>
              <p className="text-xs text-fg-subtle">Let the sender reclaim the unstreamed remainder.</p>
            </div>
            <Toggle checked={cancelable} onChange={setCancelable} label="Cancelable" />
          </div>
        </Card>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-4">
            <CardLabel>Review</CardLabel>

            <div>
              <p className="text-xs text-fg-subtle">Streaming rate</p>
              <p className="mt-1 font-display text-3xl text-fg">
                <span className="tnum flow-text">
                  {computed.rate !== undefined ? formatToken(computed.rate, asset.decimals, asset.decimals) : '0.0000000'}
                </span>
                <span className="ml-1.5 text-sm text-fg-subtle">{asset.code}/s</span>
              </p>
            </div>

            <dl className="space-y-2.5 border-t border-white/8 pt-4 text-sm">
              <Row label="Total" value={`${amount || '0'} ${asset.code}`} />
              <Row
                label="Starts"
                value={computed.start ? new Date(computed.start * 1000).toLocaleString() : '—'}
              />
              <Row
                label="Ends"
                value={computed.end ? new Date(computed.end * 1000).toLocaleString() : '—'}
              />
              <Row
                label="Cliff"
                value={
                  hasCliff && computed.cliff ? new Date(computed.cliff * 1000).toLocaleString() : 'None'
                }
              />
              <Row label="Cancelable" value={cancelable ? 'Yes' : 'No'} />
            </dl>

            {computed.error ? (
              <p className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-fg-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {computed.error}
              </p>
            ) : null}

            {!address ? (
              <Button className="w-full" onClick={connect} loading={connecting}>
                Connect wallet to continue
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={!!computed.error}
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Create stream <ArrowRight className="size-4" />
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-right text-fg">{value}</dd>
    </div>
  );
}
