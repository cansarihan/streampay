import { createHmac } from 'node:crypto';
import type { Db } from './db';

/**
 * Best-effort webhook delivery. Each registered endpoint receives the event payload; if it was
 * registered with a secret, an HMAC-SHA256 signature is attached for verification.
 */
export async function dispatchWebhooks(db: Db, payload: unknown): Promise<void> {
  const hooks = await db.listWebhooks();
  if (hooks.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    hooks.map(async (hook) => {
      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (hook.secret) {
          headers['x-streampay-signature'] = createHmac('sha256', hook.secret)
            .update(body)
            .digest('hex');
        }
        await fetch(hook.url, { method: 'POST', headers, body });
      } catch {
        // Delivery is best-effort; a failing subscriber must not break indexing.
      }
    })
  );
}
