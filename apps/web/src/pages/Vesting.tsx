import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock } from 'lucide-react';
import { StrKey } from '@stellar/stellar-sdk';
import type { CreateStreamParams } from '@streampay/sdk';
import { nowSeconds } from '@streampay/sdk';
import { streamPay } from '../lib/client';
import { useWallet } from '../lib/wallet';
import { track } from '../lib/analytics';
import { XLM } from '../lib/config';
import { formatDuration, parseUnits } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';

const TOTALS: Array<{ key: string; label: string; seconds: number }> = [
  { key: '6mo', label: '6 months', seconds: 15_552_000 },
  { key: '1y', label: '1 year', seconds: 31_536_000 },
  { key: '2y', label: '2 years', seconds: 63_072_000 },
  { key: '3y', label: '3 years', seconds: 94_608_000 },
  { key: '4y', label: '4 years', seconds: 126_144_000 },
];

const CLIFFS: Array<{ key: string; label: string; seconds: number }> = [
  { key: 'none', label: 'No cliff', seconds: 0 },
  { key: '1mo', label: '1 month', seconds: 2_592_000 },
  { key: '3mo', label: '3 months', seconds: 7_776_000 },
  { key: '6mo', label: '6 months', seconds: 15_552_000 },
  { key: '1y', label: '1 year', seconds: 31_536_000 },
];

function curve(totalSeconds: number, cliffSeconds: number) {
  const points: Array<{ label: string; pct: number }> = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = (totalSeconds * i) / N;
    const pct = t < cliffSeconds ? 0 : (t / totalSeconds) * 100;
    points.push({ label: `${Math.round((i / N) * 100)}%`, pct: Math.round(pct * 10) / 10 });
  }
  return points;
}

export function Vesting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { address, signer, connect, connecting } = useWallet();

  const asset = XLM;
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [totalKey, setTotalKey] = useState('4y');
  const [cliffKey, setCliffKey] = useState('1y');

  const totalSeconds = TOTALS.find((t) => t.key === totalKey)?.seconds ?? 0;
  const cliffSeconds = CLIFFS.find((c) => c.key === cliffKey)?.seconds ?? 0;
  const data = useMemo(() => curve(totalSeconds, cliffSeconds), [totalSeconds, cliffSeconds]);

  const validRecipient = StrKey.isValidEd25519PublicKey(recipient.trim());
  const validAmount = Number(amount) > 0;
  const cliffTooLong = cliffSeconds >= totalSeconds && cliffSeconds > 0;
  const error = !validRecipient
    ? 'Enter a valid recipient'
    : !validAmount
      ? 'Enter an amount'
      : cliffTooLong
        ? 'Cliff must be shorter than the total'
        : undefined;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!signer || !address) throw new Error('Connect a wallet first');
      const now = nowSeconds();
      const params: CreateStreamParams = {
        sender: address,
        recipient: recipient.trim(),
        token: asset.sac,
        deposit: parseUnits(amount, asset.decimals),
        startTime: now,
        cliffTime: now + cliffSeconds,
        endTime: now + totalSeconds,
        cancelable: true,
      };
      return streamPay.createStream(params, signer);
    },
    onSuccess: (id) => {
      track('vesting_created', { id });
      void queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Vesting schedule created', { description: `Stream #${id}` });
      navigate(`/app/stream/${id}`);
    },
    onError: (err: Error) => toast.error('Could not create schedule', { description: err.message }),
  });

  return (
    <div>
      <PageHeader
        title="Vesting"
        subtitle="Cliff + linear token vesting, enforced on-chain. The recipient withdraws as it unlocks."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <Field label="Recipient" hint="Who the tokens vest to.">
            <Input placeholder="G…" value={recipient} spellCheck={false} onChange={(e) => setRecipient(e.target.value)} />
          </Field>
          <Field label="Amount">
            <Input placeholder="0.00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total vesting">
              <Select value={totalKey} onChange={(e) => setTotalKey(e.target.value)}>
                {TOTALS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cliff">
              <Select value={cliffKey} onChange={(e) => setCliffKey(e.target.value)}>
                {CLIFFS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {!address ? (
            <Button className="w-full" onClick={connect} loading={connecting}>
              Connect wallet to continue
            </Button>
          ) : (
            <Button className="w-full" disabled={!!error} loading={mutation.isPending} onClick={() => mutation.mutate()}>
              <CalendarClock className="size-4" /> Create vesting schedule
            </Button>
          )}
          {error && address ? <p className="text-xs text-fg-muted">{error}</p> : null}
        </Card>

        <Card>
          <CardLabel>Unlock schedule</CardLabel>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="vest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1FE3D0" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#1FE3D0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#5C6890', fontSize: 11 }} tickLine={false} axisLine={false} interval={9} />
                <YAxis tick={{ fill: '#5C6890', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#0A1024', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E8EEFF' }}
                  formatter={(v: number) => [`${v}%`, 'Unlocked']}
                />
                <Area type="monotone" dataKey="pct" stroke="#1FE3D0" strokeWidth={2} fill="url(#vest)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-3 border-t border-white/8 pt-4 text-sm">
            <div>
              <dt className="text-fg-subtle">Total</dt>
              <dd className="text-fg">{formatDuration(totalSeconds)}</dd>
            </div>
            <div>
              <dt className="text-fg-subtle">Cliff</dt>
              <dd className="text-fg">{cliffSeconds > 0 ? formatDuration(cliffSeconds) : 'None'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
