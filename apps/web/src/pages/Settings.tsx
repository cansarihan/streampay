import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { ExternalLink, LogOut } from 'lucide-react';
import { contractExplorerUrl } from '@streampay/sdk';
import { useWallet } from '../lib/wallet';
import { API_URL, CONTRACT_ID, NETWORK, RPC_URL } from '../lib/config';
import { listRequests } from '../lib/requests';
import { listTeams } from '../lib/teams';
import { shortAddress } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardLabel } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-fg-subtle">{label}</span>
      <span className="flex items-center gap-2 text-right text-fg">{children}</span>
    </div>
  );
}

export function Settings() {
  const { address, connect, disconnect, connecting } = useWallet();

  function clearLocal() {
    localStorage.removeItem('streampay:teams');
    localStorage.removeItem('streampay:requests');
    toast.success('Local data cleared');
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Network, wallet and locally stored data." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardLabel>Network</CardLabel>
          <div className="mt-2 divide-y divide-white/5">
            <Row label="Network">Stellar {NETWORK}</Row>
            <Row label="Contract">
              <span className="tnum">{shortAddress(CONTRACT_ID, 6, 6)}</span>
              <CopyButton value={CONTRACT_ID} />
              <a
                href={contractExplorerUrl(CONTRACT_ID, NETWORK)}
                target="_blank"
                rel="noreferrer"
                className="text-fg-subtle hover:text-fg"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </Row>
            <Row label="RPC">
              <span className="max-w-56 truncate text-xs">{RPC_URL}</span>
            </Row>
            <Row label="API">
              <span className="max-w-56 truncate text-xs">{API_URL}</span>
            </Row>
          </div>
        </Card>

        <Card>
          <CardLabel>Wallet</CardLabel>
          {address ? (
            <div className="mt-3 space-y-3">
              <Row label="Connected">
                <span className="tnum">{shortAddress(address, 6, 6)}</span>
                <CopyButton value={address} />
              </Row>
              <Button variant="outline" size="sm" onClick={disconnect}>
                <LogOut className="size-4" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="mb-3 text-sm text-fg-muted">No wallet connected.</p>
              <Button size="sm" onClick={connect} loading={connecting}>
                Connect wallet
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <CardLabel>Local data</CardLabel>
          <p className="mt-2 text-sm text-fg-muted">
            Teams and request links are stored in this browser, not on a server.
          </p>
          <div className="mt-2 divide-y divide-white/5">
            <Row label="Saved teams">{listTeams().length}</Row>
            <Row label="Saved requests">{listRequests().length}</Row>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={clearLocal}>
            Clear local data
          </Button>
        </Card>

        <Card>
          <CardLabel>About</CardLabel>
          <p className="mt-2 text-sm text-fg-muted">
            StreamPay — real-time payment streaming on Stellar. Built by Can Sarıhan.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a href={`${import.meta.env.BASE_URL}docs`} className="text-aqua hover:underline">
              Documentation
            </a>
            <a
              href={contractExplorerUrl(CONTRACT_ID, NETWORK)}
              target="_blank"
              rel="noreferrer"
              className="text-aqua hover:underline"
            >
              Contract on explorer
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
