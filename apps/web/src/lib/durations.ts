export interface DurationOption {
  key: string;
  label: string;
  seconds: number;
}

export const DURATIONS: DurationOption[] = [
  { key: '1h', label: '1 hour', seconds: 3600 },
  { key: '1d', label: '1 day', seconds: 86_400 },
  { key: '1w', label: '1 week', seconds: 604_800 },
  { key: '30d', label: '30 days', seconds: 2_592_000 },
  { key: '90d', label: '90 days', seconds: 7_776_000 },
  { key: '180d', label: '180 days', seconds: 15_552_000 },
  { key: '1y', label: '1 year', seconds: 31_536_000 },
];

export function durationSeconds(key: string): number {
  return DURATIONS.find((d) => d.key === key)?.seconds ?? 0;
}
