import { cn } from '../../lib/cn';

export function Logo({ withWordmark = true, className }: { withWordmark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="sp-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3FF7E2" />
            <stop offset="0.5" stopColor="#4F8BFF" />
            <stop offset="1" stopColor="#8B6CFF" />
          </linearGradient>
        </defs>
        <path
          d="M4 11c6 0 6 5 12 5s6-5 12-5"
          stroke="url(#sp-logo)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M4 18c6 0 6 5 12 5s6-5 12-5"
          stroke="url(#sp-logo)"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight text-fg">StreamPay</span>
      )}
    </span>
  );
}
