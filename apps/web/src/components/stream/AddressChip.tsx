import { ExternalLink } from 'lucide-react';
import { shortAddress } from '../../lib/format';
import { NETWORK } from '../../lib/config';
import { CopyButton } from '../ui/CopyButton';
import { cn } from '../../lib/cn';

export function AddressChip({
  address,
  className,
  lead = 5,
  tail = 5,
}: {
  address: string;
  className?: string;
  lead?: number;
  tail?: number;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="tnum text-fg">{shortAddress(address, lead, tail)}</span>
      <CopyButton value={address} />
      <a
        href={`https://stellar.expert/explorer/${NETWORK}/account/${address}`}
        target="_blank"
        rel="noreferrer"
        className="text-fg-subtle transition hover:text-fg"
        aria-label="View on explorer"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </span>
  );
}
