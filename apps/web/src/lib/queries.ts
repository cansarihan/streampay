import { useQuery } from '@tanstack/react-query';
import type { Stream } from '@streampay/sdk';
import { streamPay } from './client';
import { api } from './api';

export interface WalletStreams {
  outgoing: Stream[];
  incoming: Stream[];
}

export function useWalletStreams(address: string | null) {
  return useQuery({
    queryKey: ['streams', address],
    enabled: !!address,
    refetchInterval: 20_000,
    queryFn: async (): Promise<WalletStreams> => {
      const [outgoing, incoming] = await Promise.all([
        streamPay.listBySender(address as string),
        streamPay.listByRecipient(address as string),
      ]);
      return { outgoing, incoming };
    },
  });
}

export function useStream(id: number | null) {
  return useQuery({
    queryKey: ['stream', id],
    enabled: id !== null && id >= 0,
    refetchInterval: 15_000,
    queryFn: () => streamPay.getStream(id as number),
  });
}

export function useProtocolStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => api.stats(), refetchInterval: 15_000, retry: 1 });
}

export function useActivity(limit = 30) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => api.activity(limit),
    refetchInterval: 15_000,
    retry: 1,
  });
}

export function useAnalyticsSummary() {
  return useQuery({ queryKey: ['analytics-summary'], queryFn: () => api.analyticsSummary(), retry: 1 });
}

export function useFeedbackSummary() {
  return useQuery({ queryKey: ['feedback-summary'], queryFn: () => api.feedbackSummary(), retry: 1 });
}
