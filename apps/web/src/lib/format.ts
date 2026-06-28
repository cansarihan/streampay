import { formatAmount } from '@streampay/sdk';

export { formatUnits, parseUnits, formatAmount, shortAddress } from '@streampay/sdk';

export function formatXlm(amount: bigint, displayDecimals = 4): string {
  return formatAmount(amount, 7, { displayDecimals });
}

export function formatToken(amount: bigint, decimals: number, displayDecimals = 4): string {
  return formatAmount(amount, decimals, { displayDecimals });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Compact human duration, e.g. "12d 4h", "8m 30s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Clock-style countdown, e.g. "14d 06:22:11" or "06:22:11". */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

export function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const units: Array<[number, string]> = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const value = Math.floor(abs / size);
      return future ? `in ${value}${label}` : `${value}${label} ago`;
    }
  }
  return 'just now';
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
