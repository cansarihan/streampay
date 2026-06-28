import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Users } from 'lucide-react';
import { StrKey } from '@stellar/stellar-sdk';
import { nowSeconds } from '@streampay/sdk';
import { useWallet } from '../lib/wallet';
import { useCreateBatch } from '../lib/batch';
import { DURATIONS, durationSeconds } from '../lib/durations';
import { XLM } from '../lib/config';
import { formatToken, parseUnits } from '../lib/format';
import { track } from '../lib/analytics';
import { ConnectGate } from '../components/layout/ConnectGate';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Toggle } from '../components/ui/Toggle';
import { AddressChip } from '../components/stream/AddressChip';

interface Row {
  recipient: string;
  amount: string;
}

const emptyRow: Row = { recipient: '', amount: '' };

export function Payroll() {
  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Open a stream to every recipient in one flow — pay a whole team by the second."
      />
      <ConnectGate message="Connect a wallet to run a payroll batch.">
        <PayrollBody />
      </ConnectGate>
    </div>
  );
}

function PayrollBody() {
  const { address, signer } = useWallet();
  const queryClient = useQueryClient();
  const { run, progress, results } = useCreateBatch();

  const asset = XLM;
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }, { ...emptyRow }]);
  const [durationKey, setDurationKey] = useState('30d');
  const [cancelable, setCancelable] = useState(true);
  const [csv, setCsv] = useState('');

  const valid = rows.filter(
    (r) => StrKey.isValidEd25519PublicKey(r.recipient.trim()) && Number(r.amount) > 0
  );
  const total = valid.reduce((acc, r) => acc + parseUnits(r.amount, asset.decimals), 0n);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { ...emptyRow }]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
  }
  function importCsv() {
    const parsed = csv
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line): Row => {
        const [recipient = '', amount = ''] = line.split(/[\s,]+/);
        return { recipient, amount };
      });
    if (parsed.length) {
      setRows(parsed);
      setCsv('');
      toast.success(`Imported ${parsed.length} row(s)`);
    }
  }

  async function send() {
    if (!signer || !address) return;
    const now = nowSeconds();
    const end = now + durationSeconds(durationKey);
    const res = await run({
      signer,
      sender: address,
      token: asset.sac,
      startTime: now,
      cliffTime: now,
      endTime: end,
      cancelable,
      items: valid.map((r) => ({ recipient: r.recipient.trim(), deposit: parseUnits(r.amount, asset.decimals) })),
    });
    const ok = res.filter((r) => r.id !== undefined).length;
    track('payroll_run', { count: ok });
    void queryClient.invalidateQueries({ queryKey: ['streams'] });
    toast[ok === res.length ? 'success' : 'warning'](`Created ${ok}/${res.length} streams`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <CardLabel>Recipients</CardLabel>
            <Button size="sm" variant="ghost" onClick={addRow}>
              <Plus className="size-4" /> Add row
            </Button>
          </div>
          {rows.map((row, i) => {
            const ok = StrKey.isValidEd25519PublicKey(row.recipient.trim());
            return (
              <div key={i} className="flex items-start gap-2">
                <Input
                  placeholder="Recipient G…"
                  value={row.recipient}
                  spellCheck={false}
                  className={!row.recipient || ok ? '' : 'border-danger/50'}
                  onChange={(e) => update(i, { recipient: e.target.value })}
                />
                <Input
                  placeholder="Amount"
                  inputMode="decimal"
                  className="max-w-32"
                  value={row.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                />
                <button
                  onClick={() => removeRow(i)}
                  className="mt-2.5 text-fg-subtle transition hover:text-danger"
                  aria-label="Remove row"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </Card>

        <Card className="space-y-3">
          <CardLabel>Import from CSV</CardLabel>
          <Textarea
            placeholder={'GABC...,100\nGDEF...,250'}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={importCsv} disabled={!csv.trim()}>
            Import rows
          </Button>
        </Card>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-4">
          <CardLabel>Batch settings</CardLabel>
          <Field label="Duration">
            <Select value={durationKey} onChange={(e) => setDurationKey(e.target.value)}>
              {DURATIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3">
            <span className="text-sm text-fg">Cancelable</span>
            <Toggle checked={cancelable} onChange={setCancelable} label="Cancelable" />
          </div>

          <dl className="space-y-2 border-t border-white/8 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Recipients</dt>
              <dd className="text-fg">{valid.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-subtle">Total</dt>
              <dd className="tnum text-fg">
                {formatToken(total, asset.decimals, 2)} {asset.code}
              </dd>
            </div>
          </dl>

          {progress.running || results.length > 0 ? (
            <div className="rounded-xl border border-white/8 p-3 text-sm">
              <p className="text-fg-muted">
                {progress.running
                  ? `Creating ${progress.done + progress.failed}/${progress.total}…`
                  : `Done · ${progress.done} created${progress.failed ? `, ${progress.failed} failed` : ''}`}
              </p>
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <AddressChip address={r.recipient} lead={4} tail={4} />
                    <span className={r.id !== undefined ? 'text-positive' : 'text-danger'}>
                      {r.id !== undefined ? `#${r.id}` : 'failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Button
            className="w-full"
            disabled={valid.length === 0}
            loading={progress.running}
            onClick={send}
          >
            <Users className="size-4" /> Send {valid.length || ''} stream{valid.length === 1 ? '' : 's'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
