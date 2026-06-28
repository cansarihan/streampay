export interface PaymentRequest {
  recipient: string;
  amount: string;
  assetCode: string;
  durationSeconds: number;
  cliffSeconds?: number;
  note?: string;
  createdAt: number;
}

export interface StoredRequest extends PaymentRequest {
  id: string;
}

const KEY = 'streampay:requests';

/** Encode a request into a URL-safe token so links are self-contained (no backend needed). */
export function encodeRequest(request: PaymentRequest): string {
  return btoa(encodeURIComponent(JSON.stringify(request)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeRequest(token: string): PaymentRequest | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(padded))) as PaymentRequest;
  } catch {
    return null;
  }
}

export function requestLink(request: PaymentRequest): string {
  return `${window.location.origin}/r/${encodeRequest(request)}`;
}

export function listRequests(): StoredRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as StoredRequest[];
  } catch {
    return [];
  }
}

export function saveRequest(request: PaymentRequest): StoredRequest {
  const stored: StoredRequest = { ...request, id: crypto.randomUUID() };
  localStorage.setItem(KEY, JSON.stringify([stored, ...listRequests()]));
  return stored;
}

export function removeRequest(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(listRequests().filter((r) => r.id !== id)));
}
