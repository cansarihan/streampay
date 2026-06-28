import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { StrKey } from '@stellar/stellar-sdk';
import { nowSeconds } from '@streampay/sdk';
import { useWallet } from '../lib/wallet';
import { useCreateBatch } from '../lib/batch';
import { DURATIONS, durationSeconds } from '../lib/durations';
import { XLM } from '../lib/config';
import { formatToken, parseUnits, shortAddress } from '../lib/format';
import { track } from '../lib/analytics';
import { createTeam, listTeams, removeTeam, updateTeam, type Team as TeamModel } from '../lib/teams';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/cn';

export function Team() {
  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newTreasury, setNewTreasury] = useState('');

  useEffect(() => {
    const t = listTeams();
    setTeams(t);
    setSelectedId((id) => id ?? t[0]?.id ?? null);
  }, []);

  function reload(selectId?: string) {
    const t = listTeams();
    setTeams(t);
    setSelectedId(selectId ?? t[0]?.id ?? null);
  }

  function create() {
    if (!newName.trim()) return;
    const team = createTeam(newName.trim(), newTreasury.trim() || undefined);
    setNewName('');
    setNewTreasury('');
    reload(team.id);
    track('team_created');
  }

  const selected = teams.find((t) => t.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="A workspace for paying a group from one place — members, roles and batch payroll."
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <CardLabel>New workspace</CardLabel>
            <Field label="Name">
              <Input placeholder="e.g. Acme DAO" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </Field>
            <Field label="Treasury (optional)" hint="A Stellar account that funds the team’s streams.">
              <Input placeholder="G…" value={newTreasury} spellCheck={false} onChange={(e) => setNewTreasury(e.target.value)} />
            </Field>
            <Button className="w-full" variant="outline" disabled={!newName.trim()} onClick={create}>
              <Plus className="size-4" /> Create workspace
            </Button>
          </Card>

          {teams.length > 0 && (
            <Card className="space-y-1.5 p-3">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                    t.id === selectedId ? 'bg-white/8 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
                  )}
                >
                  <Building2 className="size-4 text-fg-subtle" />
                  <span className="flex-1 truncate">{t.name}</span>
                  <span className="text-xs text-fg-subtle">{t.members.length}</span>
                </button>
              ))}
            </Card>
          )}
        </div>

        {selected ? (
          <TeamDetail key={selected.id} team={selected} onChange={() => reload(selected.id)} onDelete={() => reload()} />
        ) : (
          <EmptyState
            icon={<Building2 />}
            title="No workspace selected"
            description="Create a workspace to add members and run payroll from one place."
          />
        )}
      </div>
    </div>
  );
}

function TeamDetail({
  team,
  onChange,
  onDelete,
}: {
  team: TeamModel;
  onChange: () => void;
  onDelete: () => void;
}) {
  const { address, signer, connect, connecting } = useWallet();
  const queryClient = useQueryClient();
  const { run, progress } = useCreateBatch();
  const asset = XLM;

  const [addr, setAddr] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [amountEach, setAmountEach] = useState('');
  const [durationKey, setDurationKey] = useState('30d');

  function addMember() {
    if (!StrKey.isValidEd25519PublicKey(addr.trim())) {
      toast.error('Enter a valid Stellar address');
      return;
    }
    updateTeam({
      ...team,
      members: [...team.members, { address: addr.trim(), name: name.trim() || undefined, role: role.trim() || undefined }],
    });
    setAddr('');
    setName('');
    setRole('');
    onChange();
  }

  function removeMember(target: string) {
    updateTeam({ ...team, members: team.members.filter((m) => m.address !== target) });
    onChange();
  }

  async function runPayroll() {
    if (!signer || !address || Number(amountEach) <= 0 || team.members.length === 0) return;
    const now = nowSeconds();
    const res = await run({
      signer,
      sender: address,
      token: asset.sac,
      startTime: now,
      cliffTime: now,
      endTime: now + durationSeconds(durationKey),
      cancelable: true,
      items: team.members.map((m) => ({ recipient: m.address, deposit: parseUnits(amountEach, asset.decimals) })),
    });
    const ok = res.filter((r) => r.id !== undefined).length;
    track('team_payroll', { count: ok });
    void queryClient.invalidateQueries({ queryKey: ['streams'] });
    toast.success(`Streamed to ${ok}/${res.length} members`);
  }

  const totalEach = Number(amountEach) > 0 ? parseUnits(amountEach, asset.decimals) * BigInt(team.members.length) : 0n;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-fg">{team.name}</h2>
            {team.treasury && (
              <p className="mt-0.5 text-xs text-fg-subtle">Treasury {shortAddress(team.treasury)}</p>
            )}
          </div>
          <button
            onClick={() => {
              removeTeam(team.id);
              onDelete();
            }}
            className="rounded-lg p-2 text-fg-subtle transition hover:bg-white/5 hover:text-danger"
            aria-label="Delete workspace"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <CardLabel>Members ({team.members.length})</CardLabel>
          {team.members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-fg-subtle">
              No members yet.
            </p>
          ) : (
            team.members.map((m) => (
              <div key={m.address} className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{m.name || shortAddress(m.address)}</p>
                  <p className="truncate text-xs text-fg-subtle">
                    {shortAddress(m.address)}
                    {m.role ? ` · ${m.role}` : ''}
                  </p>
                </div>
                <button onClick={() => removeMember(m.address)} className="text-fg-subtle hover:text-danger" aria-label="Remove member">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 grid gap-2 border-t border-white/8 pt-4 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <Input placeholder="Address G…" value={addr} spellCheck={false} onChange={(e) => setAddr(e.target.value)} />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
          <Button size="sm" variant="outline" onClick={addMember}>
            <UserPlus className="size-4" />
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardLabel>Run payroll</CardLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount each">
            <Input placeholder="0.00" inputMode="decimal" value={amountEach} onChange={(e) => setAmountEach(e.target.value)} />
          </Field>
          <Field label="Duration">
            <Select value={durationKey} onChange={(e) => setDurationKey(e.target.value)}>
              {DURATIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-subtle">Total ({team.members.length} members)</span>
          <span className="tnum text-fg">
            {formatToken(totalEach, asset.decimals, 2)} {asset.code}
          </span>
        </div>
        {!address ? (
          <Button className="w-full" onClick={connect} loading={connecting}>
            Connect wallet to pay
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={team.members.length === 0 || Number(amountEach) <= 0}
            loading={progress.running}
            onClick={runPayroll}
          >
            <Users className="size-4" />
            Stream to {team.members.length} member{team.members.length === 1 ? '' : 's'}
          </Button>
        )}
      </Card>
    </div>
  );
}
