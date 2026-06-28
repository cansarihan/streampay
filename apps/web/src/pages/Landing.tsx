import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  Coins,
  Gauge,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  Waves,
} from 'lucide-react';
import { StreamStatus, contractExplorerUrl, nowSeconds } from '@streampay/sdk';
import type { Stream } from '@streampay/sdk';
import { CONTRACT_ID, NETWORK, XLM } from '../lib/config';
import { formatToken } from '../lib/format';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FlowCounter } from '../components/stream/FlowCounter';
import { FlowBar } from '../components/stream/FlowBar';

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

const features = [
  { icon: Waves, title: 'Linear streams', body: 'Funds release every second from start to end. The recipient withdraws what has accrued, whenever they want.' },
  { icon: CalendarClock, title: 'Cliff vesting', body: 'Nothing unlocks until the cliff — then the amount earned since the start becomes withdrawable at once.' },
  { icon: RefreshCw, title: 'Cancelable', body: 'Cancel a stream and the sender reclaims the unstreamed remainder while the recipient keeps every vested cent.' },
  { icon: Users, title: 'Payroll batches', body: 'Open many streams to many recipients in one flow — pay a whole team or DAO by the second.' },
  { icon: Link2, title: 'Payment requests', body: 'Send a shareable link to request a stream. The other side funds it in two clicks.' },
  { icon: ShieldCheck, title: 'Non-custodial', body: 'Funds live in a Soroban contract, not with us. Every release is enforced on-chain.' },
];

const steps = [
  { n: '01', title: 'Lock the funds', body: 'Choose an amount, a recipient and a window. The deposit is escrowed in the StreamPay contract.' },
  { n: '02', title: 'It streams per second', body: 'From the start time, value vests continuously — visible down to the decimal, in real time.' },
  { n: '03', title: 'Withdraw anytime', body: 'The recipient pulls the accrued balance whenever they like; the sender can cancel what hasn’t streamed.' },
];

export function Landing() {
  const demoStream = useMemo<Stream>(() => {
    const t = nowSeconds();
    return {
      id: 0,
      sender: 'GCONTRACTOR',
      recipient: 'GRECIPIENT',
      token: XLM.sac,
      deposit: 250_0000000n,
      withdrawn: 0n,
      startTime: t - 540,
      cliffTime: t - 540,
      endTime: t + 2160,
      cancelable: true,
      status: StreamStatus.Active,
      createdAt: t - 540,
    };
  }, []);

  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
            <a href="#features" className="transition hover:text-fg">Features</a>
            <a href="#how" className="transition hover:text-fg">How it works</a>
            <Link to="/docs" className="transition hover:text-fg">Docs</Link>
          </nav>
          <Link to="/app">
            <Button size="sm">
              Launch app <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <Badge tone="aqua" className="mb-5">
              <span className="live-dot" /> Live on Stellar {NETWORK}
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-6xl">
              Money that moves
              <br />
              by the <span className="flow-text">second</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
              StreamPay turns “pay over time” into an on-chain primitive. Stream salaries, grants and
              token vesting continuously — the recipient withdraws what has accrued at any moment, the
              sender reclaims what hasn’t. Non-custodial, ~5s settlement, sub-cent fees.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app/create">
                <Button size="lg">
                  Start a stream <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline">
                  Read the docs
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm text-fg-subtle">
              <span className="inline-flex items-center gap-1.5"><Gauge className="size-4 text-aqua" /> ~5s finality</span>
              <span className="inline-flex items-center gap-1.5"><Coins className="size-4 text-aqua" /> sub-cent fees</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="size-4 text-aqua" /> non-custodial</span>
            </div>
          </div>

          {/* Live demo card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="glass-strong p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                  <span className="live-dot" /> Streaming now
                </div>
                <Badge tone="violet">demo</Badge>
              </div>
              <p className="mt-6 text-xs uppercase tracking-[0.14em] text-fg-subtle">Streamed so far</p>
              <div className="mt-1 font-display text-4xl text-fg sm:text-5xl">
                <FlowCounter stream={demoStream} decimals={XLM.decimals} displayDecimals={7} />
                <span className="ml-2 text-base text-fg-subtle">XLM</span>
              </div>
              <FlowBar progress={0.2} className="mt-5" />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="tnum text-aqua">+{formatToken(demoStream.deposit / 2700n, XLM.decimals, 7)}/s</span>
                <span className="text-fg-muted">of {formatToken(demoStream.deposit, XLM.decimals, 0)} XLM</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/8 pt-5 text-sm">
                <div>
                  <p className="text-xs text-fg-subtle">Recipient</p>
                  <p className="mt-0.5 text-fg">a contractor</p>
                </div>
                <div>
                  <p className="text-xs text-fg-subtle">Window</p>
                  <p className="mt-0.5 text-fg">45 minutes</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold text-fg">A complete streaming toolkit</h2>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Everything teams need to pay over time, built on the rails Stellar was designed for.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="glass h-full p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-aqua/20 to-violet/20 text-aqua">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg text-fg">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold text-fg">How a stream works</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="glass h-full p-6">
                <span className="tnum text-2xl text-aqua/70">{s.n}</span>
                <h3 className="mt-3 font-display text-lg text-fg">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="glass-strong relative overflow-hidden p-8 text-center sm:p-14">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 flow-bar" />
          <h2 className="font-display text-3xl font-semibold text-fg sm:text-4xl">
            Start streaming in under a minute
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-fg-muted">
            Connect a Stellar wallet, pick an amount and a window, and watch value flow in real time.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link to="/app">
              <Button size="lg">
                <Wallet className="size-4" /> Launch the app
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/docs" className="transition hover:text-fg">Docs</Link>
            <a
              href={contractExplorerUrl(CONTRACT_ID, NETWORK)}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-fg"
            >
              Contract
            </a>
            <span>Built by Can Sarıhan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
