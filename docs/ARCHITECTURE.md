# Architecture

StreamPay is an npm-workspaces monorepo with four parts: a Soroban contract, a shared TypeScript
SDK, an indexer/API, and a React dashboard.

```
┌──────────────┐   reads (simulate)    ┌──────────────────────┐
│   apps/web    │ ───────────────────▶ │   Soroban contract    │
│  (React SPA)  │ ◀─ writes (signed) ── │  contracts/streampay  │
└──────┬────────┘                       └──────────┬───────────┘
       │ REST                                       │ events
       ▼                                            ▼
┌──────────────┐   getEvents + reads   ┌──────────────────────┐
│   apps/api    │ ◀──────────────────── │   Soroban RPC node    │
│ (indexer/API) │                       └──────────────────────┘
└──────────────┘
```

Both `apps/web` and `apps/api` depend on `packages/sdk`, so the contract types and the vesting math
are defined once and shared.

## Contract (`contracts/streampay`)

A token-agnostic streaming/vesting escrow.

- **State** — a `Config` (admin, fee bps, fee collector, paused) in instance storage; each `Stream`
  in persistent storage keyed by id; append-only `BySender` / `ByRecipient` id indexes so the
  frontend can read a user's streams directly from the contract without an indexer.
- **Vesting math** — `vested = deposit · (now − start) / (end − start)`, clamped to `[0, deposit]`
  and gated by the cliff (`now < cliff ⇒ 0`). Integer math; the SDK mirrors it exactly so the UI
  counter never disagrees with the chain.
- **Lifecycle** — `create_stream` escrows funds via the token's `transfer`; `withdraw` / `withdraw_max`
  pay the recipient the accrued amount minus an optional protocol fee; `cancel` pays the recipient
  what vested and refunds the remainder to the sender. Funds are conserved at every step.
- **Events** — `created`, `withdraw`, `cancel`, `paused` via `#[contractevent]`, with the stream id
  as an indexed topic for the off-chain indexer.
- **Safety** — typed errors, time-range/cliff validation, a fee cap, admin pause, and TTL bumping on
  every touched entry.

## SDK (`packages/sdk`)

A source-only internal package (consumers' bundlers transpile it):

- `StreamPayClient` — reads via `simulateTransaction` (no signing); writes build → `prepareTransaction`
  → wallet-sign → `sendTransaction` → poll. Works in the browser (with a wallet signer) and in Node
  (reads only / the indexer).
- Pure stream math (`vestedAmount`, `withdrawableAmount`, `flowRatePerSecond`, `derivedStatus`, …),
  ScVal encode/decode, amount formatting, and network config.

## Indexer & API (`apps/api`)

Express + the built-in `node:sqlite` (zero native deps):

- **Indexer** — on start, backfills every stream straight from the contract (so the DB is complete
  regardless of RPC event retention); then polls `getEvents`, logging each event and re-reading the
  affected stream. Dispatches webhooks for stream events.
- **REST** — `/api/streams`, `/api/streams/:id`, `/api/stats`, `/api/activity`, `/api/feedback`
  (+ summary), `/api/analytics/event` (+ summary), `/api/webhooks`, `/api/health`.

The contract stays the source of truth; the API is a fast cache + activity log + analytics/feedback
store. If the API is down, the dashboard still works against the contract directly.

## Web (`apps/web`)

React + Vite + Tailwind v4, in the "Liquid Flow" design system (deep ink navy, a flowing
aqua→azure→violet gradient, glass surfaces, tabular-mono live counters).

- **Wallet** — `@creit.tech/stellar-wallets-kit` (Freighter + others) behind a small context that
  exposes a `{ publicKey, signTransaction }` signer.
- **Data** — React Query; user streams are read directly from the contract via the SDK, stats /
  activity / feedback come from the API.
- **Routing** — every route is code-split (`React.lazy` + `Suspense`); an `ErrorBoundary` wraps the
  app; loading skeletons and empty states throughout.
- **Observability** — `track()` fans out to the API and optional PostHog; `reportError()` to the API
  and optional Sentry; an in-app feedback widget posts to the API.
