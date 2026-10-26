# Session handoff

## State
- **Completed:** Sessions 1, 2 and 3 of 6.
- **Next to start: Session 4 — cart, guest checkout (cash on delivery), `OnlineOrder`, atomic stock, confirmation.**

## First steps for the next AI
1. Read `README.md`, `docs/ARCHITECTURE.md`, `docs/API_INTEGRATION.md`, `docs/PROJECT_STATUS.md`.
2. Run `npm run install:all` and `npm run check`; expect: 29 unit checks, 113 routes / 99 guarded / 14 allow-listed, Store 38/38 tests, both builds ok.
3. Backend tests need MongoDB **4.2 or newer**. Use the user's own `.env` for a URI; otherwise run a local `mongod` and say so (Sessions 2-3 used standalone 8.3.7 from conda-forge; Atlas was never tested). Fresh DB recipe: `seed` → `seed:demo -- --yes` → `migrate:slugs -- --yes` → start the server with `AUTH_RATE_MAX=1000 CORS_ORIGIN=http://localhost:5174` → `test:public` (`MONGO_URI` for the inactive-shop check, `BASE_RL` + a second server at `PUBLIC_RATE_MAX=5` for the rate-limit check). `test:probe` (`REAL_MONGO=1`) and `test:authz` need a seeded DB; `test:public` needs a **fresh** one. For repeated browser runs start the server with a high `PUBLIC_RATE_MAX`.
4. Read `management/server/services/publicService.js` + `routes/publicRoutes.js`, `store/src/components/ProductBrowser.tsx`, `store/src/pages/ProductPage.tsx`, `store/src/services/publicApi.ts`.

## Session 4 scope (suggestion; keep it additive)
- Backend: `OnlineOrder` model (shop-scoped, `shopId` on every query), `POST /api/public/shops/:slug/orders` (guest: name, phone, address, items `{productId, quantity}`; **server re-prices from the database, ignores client prices, checks `isPublished`/`isActive`/stock and decrements stock atomically**, one shop per order, COD only, quantity caps, strict validation, its own stricter rate limit), plus order number and a lookup (`number` + phone). Add routes to `routeCoverage` with a stated reason, extend `test:public`/new tests (stock race, price tampering, cross-shop product, unpublished product, rate limit).
- Store: cart state in the browser only (localStorage, validated on load, one shop at a time or per-shop carts), `CartPage`, checkout form with clear errors, confirmation page. The cart must re-fetch current price/stock; never trust stored prices. Add an "Add to cart" button on the product page only for in-stock products.
- Portal order management is Session 5.

## Facts to keep in mind
- Store routes: `/shops`, `/shop/:slug`, `/shop/:slug/product/:id`, `/cart`, `/orders/track`. Error codes the Store relies on: 404 `SHOP_NOT_FOUND`, 404 `PRODUCT_NOT_FOUND`, 404 `NOT_FOUND` (backend without the public module), 400 `VALIDATION`, 429 `RATE_LIMITED`.
- Products list is paginated (default 24, max 50). `price` is already the effective price; `originalPrice` is non-null only for a real discount. Clothes `subCategory` is `''`; clothes `sizes`/`colors` have at most one entry; sizes/colors have no per-variant stock, so an order cannot pick a variant with its own stock (store the chosen size/color as text on the order line if you add it).
- The public `id`s are Mongo ObjectIds. Money is a JS Number in rupees; do arithmetic on the server only.
- Owner switches live in the portal Products pages (storefront: `shop.edit`; publish: `products.edit`).
- URL state pattern in the Store: `useSearchParams`, page sent to the API only when 2+, product page receives `state.back` (a `?...` string) from the card.

## Not verified at the end of Session 3
Atlas / replica set (transactions matter for Session 4 stock decrements: the backend's `withTransaction` falls back without a replica set — decrement with a single atomic conditional update such as `findOneAndUpdate({ _id, shopId, stockQuantity: { $gte: qty } }, { $inc: ... })`), production-mode start-up, a11y tooling, Firefox/Safari, real devices, Cashier/Manager portal UI, browser CORS from another origin. See `docs/PROJECT_STATUS.md`.

## Do not
- Do not rebuild or restyle the management portal, or change its auth/RBAC.
- Do not add a database or product copy to `store/`.
- Do not commit `.env` files or put secrets in `VITE_*`.
- Do not claim integration is verified unless it ran against a live backend; do not expose `costPrice`, exact stock or internal ids beyond what `PublicShop`/`PublicProduct` list.
- Rotate the Atlas password and `JWT_SECRET` (the Session 1 ZIP contained a real `.env`).

## Commands
`npm run install:all` · `npm run check` · `npm run check:store` · `npm run check:management` · `npm run dev:api|dev:portal|dev:store` · in `management/server`: `npm run migrate:slugs [-- --yes]`, `test:public`, `test:probe`, `test:authz`.
