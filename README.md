<div align="center">

# StreamPay

### Money that moves by the second — real-time payment streaming on Stellar

Pay salaries, grants, contractor invoices and token vesting **continuously** instead of in lump sums.
Funds vest per-second on-chain; the recipient withdraws what has accrued at any moment, and the
sender can cancel to reclaim whatever hasn't streamed yet — all non-custodial, settled in ~5s on
Soroban.

[Live demo](#) · [Contract on testnet](https://stellar.expert/explorer/testnet/contract/CCFKV5HTRL33DCWURXES7IX6JR2MWSFW4LSC7UVTWONUPOGANAPETLHT) · [Demo video](#) · Built by **Can Sarıhan**

</div>

---

## Why streaming, why Stellar

A salary is earned every second but paid once a month. A grant is delivered up front and trusted to
be used over time. Vesting is tracked in spreadsheets. **StreamPay turns "pay over time" into a
first-class on-chain primitive:** lock an amount, set a start/cliff/end, and value flows continuously
to the recipient.

Stellar is the right base layer for it:

- **~5s finality & sub-cent fees** make per-second accounting and frequent withdrawals economical.
- **Soroban** gives the programmable escrow: linear + cliff vesting math, cancelation splits,
  protocol fees and events, all enforced on-chain.
- **Token-agnostic** — any Stellar Asset Contract (USDC, EURC, XLM, custom tokens) can be streamed.

## What's inside

| Capability | Description |
| --- | --- |
| **Linear streams** | Per-second release from `start` to `end`, withdrawable any time. |
| **Cliff vesting** | Nothing withdrawable until the cliff, then the accrued amount unlocks. |
| **Cancelable streams** | Sender reclaims the unstreamed remainder; recipient keeps what vested. |
| **Payroll batches** | Open many streams to many recipients in one flow (CSV import). |
| **Vesting schedules** | Cliff + linear curves for token/equity grants, with a visual schedule. |
| **Stream requests** | Request a stream from someone via a shareable public link. |
| **Teams / treasury** | Multi-member workspaces funding streams from a shared treasury. |

## Architecture

```
streampay/
├── contracts/streampay   Soroban (Rust) — streams, vesting math, withdraw/cancel, fees, events
├── packages/sdk          TypeScript SDK — typed contract client + stream math, shared by web & api
├── apps/api              Express + SQLite — Soroban event indexer, REST API, feedback, webhooks
└── apps/web              React + Vite + Tailwind — the "Liquid Flow" dashboard, widget & docs
```

**Data flow:** sender signs `create_stream` → contract escrows funds & emits an event → the indexer
ingests it into the API → the dashboard shows the stream with a live per-second counter → recipient
signs `withdraw` for the accrued amount.

## Quickstart

```bash
# 1. Install deps
npm install

# 2. Build & test the contract
npm run contract:test
npm run contract:build

# 3. Run the stack (web + api)
npm run dev:api      # http://localhost:8787
npm run dev:web      # http://localhost:5173
```

Full setup, deployment (Vercel + Docker) and environment variables are documented in
[`docs/`](./docs).

## Contract interface (summary)

| Method | Who | Effect |
| --- | --- | --- |
| `create_stream(...)` | sender | Escrow `deposit`, open a stream, return its id |
| `withdraw(id, amount)` | recipient | Send the accrued (minus protocol fee) to the recipient |
| `cancel(id)` | sender | Pay out vested to recipient, refund the rest to sender |
| `streamed_amount(id)` / `withdrawable_amount(id)` | anyone | Read live vesting state |
| `get_streams_by_sender/recipient(addr)` | anyone | List a user's stream ids |

## Deployment (Stellar testnet)

| | |
| --- | --- |
| **Contract ID** | [`CCFKV5HTRL33DCWURXES7IX6JR2MWSFW4LSC7UVTWONUPOGANAPETLHT`](https://stellar.expert/explorer/testnet/contract/CCFKV5HTRL33DCWURXES7IX6JR2MWSFW4LSC7UVTWONUPOGANAPETLHT) |
| **Network** | Test SDF Network ; September 2015 |
| **RPC** | `https://soroban-testnet.stellar.org` |
| **Streamable asset** | Native XLM (SAC `CDLZFC3S…CYSC`) — frictionless, every testnet account is funded |

Machine-readable addresses live in [`deployments/testnet.json`](./deployments/testnet.json).

## Status

Testnet MVP for **Risein Level 4 (Green Belt)**. The contract is live and has settled real streaming
payments on testnet; the dashboard, SDK and indexer are built on top of it.

## License

MIT © Can Sarıhan
