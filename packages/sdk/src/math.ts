import type { Stream } from './types';
import { StreamStatus } from './types';

/** Current unix time in whole seconds. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Amount vested at `nowSec`. Mirrors the on-chain integer math exactly so the UI counter and the
 * contract never disagree: linear from start→end, gated by the cliff, clamped to the deposit.
 */
export function vestedAmount(s: Stream, nowSec: number): bigint {
  if (nowSec < s.cliffTime) return 0n;
  if (nowSec >= s.endTime) return s.deposit;
  const elapsed = BigInt(Math.floor(nowSec) - s.startTime);
  const duration = BigInt(s.endTime - s.startTime);
  if (duration <= 0n) return s.deposit;
  return (s.deposit * elapsed) / duration;
}

/** Amount the recipient can withdraw right now (vested minus already withdrawn). */
export function withdrawableAmount(s: Stream, nowSec: number): bigint {
  const vested = vestedAmount(s, nowSec);
  return vested > s.withdrawn ? vested - s.withdrawn : 0n;
}

/** Amount still locked and not yet streamed. */
export function remainingAmount(s: Stream, nowSec: number): bigint {
  const vested = vestedAmount(s, nowSec);
  return s.deposit > vested ? s.deposit - vested : 0n;
}

/** Tokens released per second (base units), averaged over the stream window. */
export function flowRatePerSecond(s: Stream): bigint {
  const duration = BigInt(s.endTime - s.startTime);
  return duration > 0n ? s.deposit / duration : 0n;
}

/** Fraction of the window elapsed, 0..1. */
export function streamProgress(s: Stream, nowSec: number): number {
  if (s.endTime <= s.startTime) return 1;
  if (nowSec <= s.startTime) return 0;
  if (nowSec >= s.endTime) return 1;
  return (nowSec - s.startTime) / (s.endTime - s.startTime);
}

/** True once the cliff has been reached and funds can be withdrawn. */
export function isCliffReached(s: Stream, nowSec: number): boolean {
  return nowSec >= s.cliffTime;
}

/** A display-friendly status that accounts for time, not just the stored enum. */
export type DerivedStatus = 'scheduled' | 'streaming' | 'cliff' | 'completed' | 'canceled' | 'depleted';

export function derivedStatus(s: Stream, nowSec: number): DerivedStatus {
  if (s.status === StreamStatus.Canceled) return 'canceled';
  if (s.status === StreamStatus.Depleted) return 'depleted';
  if (nowSec < s.startTime) return 'scheduled';
  if (nowSec < s.cliffTime) return 'cliff';
  if (nowSec >= s.endTime) return 'completed';
  return 'streaming';
}

/** Seconds until the stream fully vests (0 if already complete). */
export function secondsRemaining(s: Stream, nowSec: number): number {
  return Math.max(0, s.endTime - nowSec);
}
