# MarketSuite Store

Two **separate** applications that share one backend and one database:

| Folder | What it is | Status |
| --- | --- | --- |
| `management/` | The **existing** MERN management portal (POS, inventory, staff, suppliers, finance). `management/server` is the shared backend/API (now also serves the public `/api/public/*`); `management/client` is the owner-facing portal (now has the "Online store" and per-product "Online" switches). | Working (existing). Not rebuilt; small additions in Session 2. |
| `store/` | The **new** public customer website: browse shops, products, cart, orders. React + Vite + TypeScript + Tailwind. | Shops, shop pages with product search / category filter / pages, and product detail work against the real backend. Cart, checkout and tracking come in Sessions 4-5. |

Goal: when a shop owner enables their shop in the management portal, that shop automatically appears on the Store with its published products; customer orders flow back into the portal. See `docs/ARCHITECTURE.md`.

> **Current stage: Session 3 of 6 complete.** Read `docs/SESSION_HANDOFF.md` first, then `docs/PROJECT_STATUS.md`.

## Prerequisites
Node.js 20+ and MongoDB **4.2 or newer** (Atlas or local) for the management backend — the installed driver refuses older servers.

## Setup
```bash
npm run install:all
cp management/server/.env.example management/server/.env   # fill in MONGO_URI and JWT_SECRET; add the Store origin to CORS_ORIGIN
cp store/.env.example store/.env                           # optional in development
```

## Run (three terminals)
```bash
npm run dev:api      # backend  -> http://localhost:5000   (needs MongoDB; seed: npm --prefix management/server run seed, then seed:demo -- --yes)
npm run dev:portal   # portal   -> http://localhost:5173
npm run dev:store    # store    -> http://localhost:5174   (proxies /api to http://localhost:5000)
```
In development the Vite proxy forwards `/api`, so CORS is only needed when the Store is deployed on another origin (add it to `CORS_ORIGIN`).

### Putting a shop on the Store
1. Existing databases: `npm --prefix management/server run migrate:slugs -- --yes` (adds the public URL name to shops that have none; drop `--yes` for a dry run).
2. In the portal, as the Owner, open **Products** and switch **Online store** on (this makes the shop's name, type, city, address and phone public).
3. Mark products **Online** with the switch on each product. Only those appear on the Store, at `http://localhost:5174/shop/<slug>` (product pages at `/shop/<slug>/product/<id>`).

## Checks
```bash
npm run check:store        # lint + typecheck + tests + production build of the Store
npm run check:management   # backend unit + route-coverage tests, portal build
```
Backend HTTP tests (`test:public`, `test:probe`, `test:authz`, run inside `management/server`) need a running server and a **throw-away** seeded database; they create data. `test:public` needs a fresh seed; `test:authz` needs the server started with `AUTH_RATE_MAX=1000`; start the server with `CORS_ORIGIN=http://localhost:5174` for the CORS check. See `docs/SESSION_HANDOFF.md` and `docs/evidence/`.

## Secrets
Real `.env` files are never included in ZIPs or Git. Store `VITE_*` values are public.

## Documentation
`docs/PROJECT_STATUS.md` · `docs/ARCHITECTURE.md` · `docs/API_INTEGRATION.md` · `docs/SESSION_HANDOFF.md` · `docs/CHANGELOG.md` · management's own docs in `management/README.md` and `management/docs/`.
