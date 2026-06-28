import { api } from './api';

// PostHog (product analytics) and Sentry (error tracking) are both optional and env-gated. When the
// keys are unset they are no-ops and never loaded; the backend always records events so wallet
// interactions are captured regardless.

interface PostHogLike {
  capture: (name: string, props?: Record<string, unknown>) => void;
  identify: (id: string) => void;
  reset: () => void;
}
interface SentryLike {
  captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => void;
  setUser: (user: { id: string } | null) => void;
}

let currentWallet: string | null = null;
let posthog: PostHogLike | null = null;
let sentry: SentryLike | null = null;

export async function initAnalytics(): Promise<void> {
  const env = import.meta.env;

  if (env.VITE_POSTHOG_KEY) {
    try {
      const mod = await import('posthog-js');
      mod.default.init(env.VITE_POSTHOG_KEY, {
        api_host: env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        capture_pageview: true,
        persistence: 'localStorage',
      });
      posthog = mod.default as unknown as PostHogLike;
    } catch {
      /* analytics is best-effort */
    }
  }

  if (env.VITE_SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn: env.VITE_SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: env.VITE_NETWORK ?? 'testnet',
      });
      sentry = Sentry as unknown as SentryLike;
    } catch {
      /* error tracking is best-effort */
    }
  }
}

export function setAnalyticsWallet(address: string | null): void {
  currentWallet = address;
  if (posthog) {
    if (address) posthog.identify(address);
    else posthog.reset();
  }
  sentry?.setUser(address ? { id: address } : null);
}

export function track(name: string, props?: Record<string, unknown>): void {
  void api.track(name, currentWallet, props);
  posthog?.capture(name, { wallet: currentWallet, ...props });
}

export function reportError(error: Error, context?: Record<string, unknown>): void {
  console.error('[streampay] UI error:', error, context);
  void api.track('client_error', currentWallet, { message: error.message, ...context });
  sentry?.captureException(error, { extra: context });
}
