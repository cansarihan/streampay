import { Menu } from 'lucide-react';
import { WalletButton } from './WalletButton';
import { Badge } from '../ui/Badge';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-ink-950/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-fg-muted transition hover:bg-white/5 hover:text-fg lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
      <div className="ml-auto flex items-center gap-3">
        <Badge tone="aqua" className="hidden sm:inline-flex">
          Testnet
        </Badge>
        <WalletButton />
      </div>
    </header>
  );
}
