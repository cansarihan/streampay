import { API_URL } from './config';

export interface ApiStream {
  id: number;
  sender: string;
  recipient: string;
  token: string;
  deposit: string;
  withdrawn: string;
  startTime: number;
  cliffTime: number;
  endTime: number;
  cancelable: boolean;
  status: number;
  createdAt: number;
  txHash: string | null;
}

export interface ProtocolStats {
  totalStreams: number;
  activeStreams: number;
  completedStreams: number;
  canceledStreams: number;
  uniqueUsers: number;
  totalValueLocked: string;
  totalDeposited: string;
  totalWithdrawn: string;
}

export interface ActivityEvent {
  type: string;
  streamId: number | null;
  ledger: number | null;
  txHash: string | null;
  data: unknown;
  createdAt: number;
}

export interface FeedbackSummary {
  count: number;
  averageRating: number | null;
  recent: Array<{
    id: number;
    wallet: string | null;
    rating: number | null;
    message: string;
    category: string | null;
    createdAt: number;
  }>;
}

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueWallets: number;
  byName: Array<{ name: string; count: number }>;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  stats: () => http<ProtocolStats>('/api/stats'),
  activity: (limit = 50) => http<{ events: ActivityEvent[] }>(`/api/activity?limit=${limit}`),
  stream: (id: number) => http<{ stream: ApiStream }>(`/api/streams/${id}`),
  feedback: (body: { wallet?: string | null; rating?: number | null; message: string; category?: string }) =>
    http<{ ok: true }>('/api/feedback', { method: 'POST', body: JSON.stringify(body) }),
  feedbackSummary: () => http<FeedbackSummary>('/api/feedback/summary'),
  analyticsSummary: () => http<AnalyticsSummary>('/api/analytics/summary'),
  track: (name: string, wallet: string | null, props?: Record<string, unknown>) =>
    http('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ name, wallet, props: props ?? null }),
    }).catch(() => {
      /* analytics is best-effort */
    }),
};
