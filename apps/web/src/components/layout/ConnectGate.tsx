import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import { useWallet } from '../../lib/wallet';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export function ConnectGate({ children, message }: { children: ReactNode; message?: string }) {
  const { address, connect, connecting } = useWallet();
  if (address) return <>{children}</>;
  return (
    <EmptyState
      icon={<Wallet />}
      title="Connect your wallet"
      description={message ?? 'Connect a Stellar wallet to view and manage your streams.'}
      action={
        <Button onClick={connect} loading={connecting}>
          Connect wallet
        </Button>
      }
    />
  );
}
