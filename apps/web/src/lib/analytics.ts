import { api } from './api';

// PostHog and Sentry are wired in the observability task; until then `track` records to our own
// backend so wallet interactions are always captured.
let currentWallet: string | null = null;

export function setAnalyticsWallet(address: string | null): void {
  currentWallet = address;
}

export function track(name: string, props?: Record<string, unknown>): void {
  void api.track(name, currentWallet, props);
}

export function reportError(error: Error, context?: Record<string, unknown>): void {
  console.error('[streampay] UI error:', error, context);
  void api.track('client_error', currentWallet, { message: error.message, ...context });
}

export function initAnalytics(): void {
  // extended in the observability task (PostHog + Sentry)
}
