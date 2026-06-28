import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink, Link2, Trash2 } from 'lucide-react';
import { useWallet } from '../lib/wallet';
import { DURATIONS, durationSeconds } from '../lib/durations';
import { XLM } from '../lib/config';
import { formatDuration } from '../lib/format';
import { track } from '../lib/analytics';
import {
  listRequests,
  removeRequest,
  requestLink,
  saveRequest,
  type StoredRequest,
} from '../lib/requests';
import { ConnectGate } from '../components/layout/ConnectGate';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';

export function Requests() {
  return (
    <div>
      <PageHeader
        title="Payment requests"
        subtitle="Share a link to get paid as a stream. The other side funds it in two clicks — no account needed."
      />
      <ConnectGate message="Connect a wallet so requests are addressed to you.">
        <RequestsBody />
      </ConnectGate>
    </div>
  );
}

function RequestsBody() {
  const { address } = useWallet();
  const asset = XLM;
  const [amount, setAmount] = useState('');
  const [durationKey, setDurationKey] = useState('30d');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<StoredRequest[]>([]);

  useEffect(() => setSaved(listRequests()), []);

  function create() {
    if (!address || Number(amount) <= 0) return;
    saveRequest({
      recipient: address,
      amount,
      assetCode: asset.code,
      durationSeconds: durationSeconds(durationKey),
      note: note.trim() || undefined,
      createdAt: Date.now(),
    });
    setSaved(listRequests());
    setAmount('');
    setNote('');
    track('request_created');
    toast.success('Request link created');
  }

  function copy(req: StoredRequest) {
    void navigator.clipboard.writeText(requestLink(req));
    toast.success('Link copied');
  }
  function remove(id: string) {
    removeRequest(id);
    setSaved(listRequests());
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CardLabel>New request</CardLabel>
        <Field label="Amount">
          <Input placeholder="0.00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Stream duration">
          <Select value={durationKey} onChange={(e) => setDurationKey(e.target.value)}>
            {DURATIONS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note" hint="Optional — shown to whoever opens the link.">
          <Input placeholder="e.g. October retainer" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={Number(amount) <= 0} onClick={create}>
          <Link2 className="size-4" /> Create request link
        </Button>
      </Card>

      <div className="min-w-0 space-y-3">
        <CardLabel>Your requests</CardLabel>
        {saved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-fg-subtle">
            No requests yet. Create one to share a payment link.
          </p>
        ) : (
          saved.map((req) => (
            <Card key={req.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-fg">
                  {req.amount} {req.assetCode}{' '}
                  <span className="text-sm text-fg-subtle">over {formatDuration(req.durationSeconds)}</span>
                </p>
                {req.note && <p className="truncate text-sm text-fg-muted">{req.note}</p>}
                <p className="mt-0.5 truncate text-xs text-fg-subtle">{requestLink(req)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => copy(req)} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Copy link">
                  <Copy className="size-4" />
                </button>
                <a href={requestLink(req)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Open">
                  <ExternalLink className="size-4" />
                </a>
                <button onClick={() => remove(req.id)} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-danger" aria-label="Delete">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
