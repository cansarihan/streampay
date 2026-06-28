import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { contractExplorerUrl } from '@streampay/sdk';
import { CONTRACT_ID, NETWORK, RPC_URL } from '../lib/config';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-fg">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/8 bg-ink-900/60 p-4 text-xs leading-relaxed text-fg">
      <code>{children}</code>
    </pre>
  );
}

const methods: Array<[string, string]> = [
  ['create_stream(sender, recipient, token, deposit, start, cliff, end, cancelable)', 'Escrow the deposit and open a stream. Returns the new id.'],
  ['withdraw(id, amount)', 'Send a specific accrued amount to the recipient (minus protocol fee).'],
  ['withdraw_max(id)', 'Withdraw everything currently available.'],
  ['cancel(id)', 'Pay the recipient what vested, refund the rest to the sender.'],
  ['streamed_amount(id) / withdrawable_amount(id)', 'Read live vesting state.'],
  ['get_streams_by_sender / by_recipient(addr)', 'List a user’s stream ids.'],
];

export function Docs() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/app">
            <Button size="sm">
              Launch app <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-fg">Documentation</h1>
          <p className="mt-2 text-fg-muted">
            StreamPay turns “pay over time” into an on-chain primitive on Stellar. This page covers how
            streams work, the contract surface, and how to build on it.
          </p>
        </div>

        <Section title="How a stream works">
          <p>
            A sender escrows an amount of any Stellar Asset Contract token. From the start time it vests
            linearly to the end time; nothing is withdrawable before the cliff. The recipient withdraws
            whatever has accrued at any moment, and the sender can cancel a cancelable stream to reclaim
            the not-yet-streamed remainder. Everything is enforced by the Soroban contract — funds never
            touch a custodian.
          </p>
        </Section>

        <Section title="Contract">
          <p>
            Deployed on Stellar {NETWORK} at{' '}
            <a
              href={contractExplorerUrl(CONTRACT_ID, NETWORK)}
              target="_blank"
              rel="noreferrer"
              className="text-aqua hover:underline"
            >
              {CONTRACT_ID}
            </a>
            .
          </p>
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-white/5">
                {methods.map(([sig, desc]) => (
                  <tr key={sig} className="align-top">
                    <td className="w-1/2 p-3 font-mono text-aqua/90">{sig}</td>
                    <td className="p-3 text-fg-muted">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Using the dashboard">
          <p>
            <strong className="text-fg">Create</strong> a one-off stream, run <strong className="text-fg">payroll</strong>{' '}
            to many recipients at once, set up cliff + linear <strong className="text-fg">vesting</strong>, share a{' '}
            <strong className="text-fg">request</strong> link to get paid, or manage a <strong className="text-fg">team</strong>{' '}
            workspace and pay everyone from one place. On a stream’s page the recipient withdraws and the
            sender can cancel.
          </p>
        </Section>

        <Section title="For developers">
          <p>The TypeScript SDK wraps the contract with a typed client and client-side vesting math:</p>
          <Code>{`import { StreamPayClient, parseUnits } from '@streampay/sdk';

const client = new StreamPayClient({
  contractId: '${CONTRACT_ID}',
  rpcUrl: '${RPC_URL}',
  networkPassphrase: 'Test SDF Network ; September 2015',
});

// reads need no signer
const stream = await client.getStream(0);

// writes take a wallet signer ({ signedTxXdr })
const id = await client.createStream({
  sender, recipient, token,
  deposit: parseUnits('100', 7),
  startTime, cliffTime, endTime,
  cancelable: true,
}, signer);`}</Code>
        </Section>

        <footer className="border-t border-white/8 pt-6 text-sm text-fg-subtle">
          Built by Can Sarıhan · MIT licensed
        </footer>
      </main>
    </div>
  );
}
