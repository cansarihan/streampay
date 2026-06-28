import { useState } from 'react';
import { LogOut, Wallet } from 'lucide-react';
import { useWallet } from '../../lib/wallet';
import { shortAddress } from '../../lib/format';
import { Button } from '../ui/Button';

export function WalletButton() {
  const { address, connect, disconnect, connecting } = useWallet();
  const [open, setOpen] = useState(false);

  if (!address) {
    return (
      <Button onClick={connect} loading={connecting} size="sm">
        <Wallet className="size-4" />
        Connect wallet
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        <span className="live-dot" />
        <span className="tnum">{shortAddress(address)}</span>
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute right-0 z-30 mt-2 w-48 p-1.5">
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted transition hover:bg-white/5 hover:text-fg"
            >
              <LogOut className="size-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
