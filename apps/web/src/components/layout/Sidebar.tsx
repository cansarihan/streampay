import { NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarClock,
  LayoutDashboard,
  Link2,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from './Logo';
import { cn } from '../../lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const items: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/create', label: 'Create stream', icon: Plus },
  { to: '/app/streams', label: 'Streams', icon: ArrowLeftRight },
  { to: '/app/payroll', label: 'Payroll', icon: Users },
  { to: '/app/vesting', label: 'Vesting', icon: CalendarClock },
  { to: '/app/requests', label: 'Requests', icon: Link2 },
  { to: '/app/team', label: 'Team', icon: Building2 },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/8 bg-ink-900/80 backdrop-blur-xl',
        className
      )}
    >
      <div className="flex h-16 items-center px-6">
        <NavLink to="/" onClick={onNavigate}>
          <Logo />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-white/8 text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'text-fg-muted hover:bg-white/5 hover:text-fg'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-[1.05rem]', isActive && 'text-aqua')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/8 px-5 py-4 text-xs text-fg-subtle">
        <p className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-positive" />
          Stellar testnet
        </p>
        <p className="mt-1">Built by Can Sarıhan</p>
      </div>
    </aside>
  );
}
