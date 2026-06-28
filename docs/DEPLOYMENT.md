# Deployment

The testnet contract is already deployed (see the README). These steps cover redeploying the
contract and shipping the web + API.

## Contract (Stellar testnet)

```bash
# identity + funding
stellar keys generate streampay-deployer --network testnet --fund
DEPLOYER=$(stellar keys address streampay-deployer)

# build + deploy
npm run contract:build
CID=$(stellar contract deploy \
  --wasm contracts/target/wasm32v1-none/release/streampay.wasm \
  --source streampay-deployer --network testnet)

# initialize (admin, fee bps, fee collector)
stellar contract invoke --id "$CID" --source streampay-deployer --network testnet -- \
  initialize --admin "$DEPLOYER" --fee_bps 0 --fee_collector "$DEPLOYER"
```

Record the new id in `deployments/testnet.json` and the `VITE_CONTRACT_ID` / `CONTRACT_ID` env vars.

## Web (Vercel)

The web app is a static SPA. The included `vercel.json` builds the `@streampay/web` workspace from
the repo root and rewrites all routes to `index.html`.

```bash
npm i -g vercel
vercel            # first run links the project
vercel --prod     # production deploy
```

Set the environment variables (Project → Settings → Environment Variables):

| Variable | Default |
| --- | --- |
| `VITE_API_URL` | your deployed API URL |
| `VITE_CONTRACT_ID` | `CCFKV5HTRL33DCWURXES7IX6JR2MWSFW4LSC7UVTWONUPOGANAPETLHT` |
| `VITE_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `VITE_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `VITE_POSTHOG_KEY` *(optional)* | PostHog project key |
| `VITE_SENTRY_DSN` *(optional)* | Sentry DSN |

### GitHub Pages (frontend-only quick deploy)

The live demo is hosted on GitHub Pages. Build with the repo subpath as the base and publish `dist`
to a `gh-pages` branch — a `.nojekyll` file plus an `index.html` → `404.html` copy give SPA routing
for deep links:

```bash
VITE_BASE=/streampay/ npm run build -w @streampay/web
cp apps/web/dist/index.html apps/web/dist/404.html
touch apps/web/dist/.nojekyll
# publish apps/web/dist to the gh-pages branch, then enable Pages (branch: gh-pages, path: /)
```

The app reads streams directly from the contract, so it is fully functional without the API — only
the Analytics page and feedback storage need the API deployed.

## API (Docker / Render / Railway / Fly)

The API is a container (`apps/api/Dockerfile`, build context = repo root). The included `render.yaml`
provisions a free web service with a persistent disk for the SQLite file.

```bash
# local container
docker build -f apps/api/Dockerfile -t streampay-api .
docker run -p 8787:8787 -v streampay-data:/app/data streampay-api
```

| Variable | Default |
| --- | --- |
| `PORT` | `8787` |
| `CORS_ORIGIN` | `*` (set to your web origin in production) |
| `CONTRACT_ID` / `RPC_URL` / `NETWORK_PASSPHRASE` | from `deployments/testnet.json` |
| `DB_PATH` | `/app/data/streampay.db` |
| `INDEXER_ENABLED` | `true` |

After deploying both, set the web app's `VITE_API_URL` to the API URL and the API's `CORS_ORIGIN` to
the web origin.
