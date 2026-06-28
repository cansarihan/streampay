# Demo & user onboarding

## Demo video script (~2–3 min)

1. **Hook (0:00)** — open the landing page; the hero counter is already streaming live. "Money that
   moves by the second." One line on the problem: salaries are earned per second but paid monthly.
2. **Create a stream (0:20)** — connect Freighter (testnet), go to *Create*, enter a recipient and an
   amount, pick a duration, show the live rate preview, sign. Land on the stream page with the counter
   ticking up.
3. **Withdraw (0:55)** — as the recipient, withdraw the accrued amount; show the balance and the
   on-chain tx on stellar.expert.
4. **Cancel split (1:15)** — as the sender, cancel a stream; show the modal that splits vested vs.
   refund, then sign.
5. **Payroll + vesting (1:35)** — run a payroll batch to a couple of recipients; open *Vesting* and
   show the cliff + linear unlock curve.
6. **Requests (2:00)** — create a payment-request link and open it in a fresh tab to show the public
   funding page (this is how you onboard others).
7. **Analytics (2:20)** — the Analytics page: protocol stats, the live activity feed (real indexed
   on-chain events), app-event chart and user feedback. Mention the in-app feedback widget.

## Onboarding 10+ users (real wallet interactions)

Each of these is a real, signed, on-chain interaction — proof lives in the **Analytics → Recent
activity** feed (each row links to the tx on stellar.expert) and in `/api/stats` (`uniqueUsers`).

- **Share request links.** Create payment-request links (*Requests*) and send them to peers; when they
  open the link and fund the stream, that's a wallet interaction from a new account.
- **Pay a test team.** Add a few testnet addresses to a *Team* and run payroll — each recipient is a
  distinct account; have them connect and withdraw.
- **Ask for a withdraw.** Recipients withdrawing accrued funds are interactions too.

Because the demo asset is native XLM, anyone with a Freighter testnet account (auto-funded by
Friendbot) can interact immediately — no faucet or trustline needed.

## Feedback collection

The floating feedback widget (bottom-right of the app) collects a rating, category and message into
the API. A live summary — count, average rating and recent messages — is shown on the **Analytics**
page and available at `GET /api/feedback/summary`.
