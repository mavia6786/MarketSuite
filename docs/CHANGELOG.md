# Changelog

## Session 3 — 2026-10-22
- Baseline confirmed (`npm run check`: 29 unit, 112/99/13 routes, Store 20/20, both builds) before any change.
- **Backend (additive):** `GET /api/public/shops/:slug/categories` (distinct categories of published products) with tests and an allow-list entry; routes now 113 / 99 guarded / 14 allow-listed; `test:public` has 89 checks.
- **Store:** shop page shows products with debounced search, category chips, Previous/Next pages and loading/empty/error states, all in the URL; new product detail page `/shop/:slug/product/:id` (photo, price and discount, stock, sizes/colors display, contact the shop); components `ProductCard`, `ProductImage`, `Price`, `Pagination`, `ProductBrowser`; `getShopCategories`; `page` is sent only when 2 or more.
- **Fixes found while verifying in a browser:** the shop page jumped down to "Products" on first load (effect ran twice under StrictMode) — now it scrolls only when the page number changes, with a regression test; stale "added in Session 2" text in the backend-missing notice replaced.
- Store tests: 38 (was 20). Browser checks: 27 desktop + 27 mobile.

## Session 2 — 2026-10-21
- Baseline confirmed (`install:all`, `check`), then set up a real standalone MongoDB 8.3.7 and ran the existing probe/authz suites on it for the first time (37/0/2 and 42/42).
- **Backend:** `Shop.slug` (partial unique index) and `Shop.storefrontEnabled`; `isPublished` on `ShoeProduct` and `ClothingProduct`; `utils/slug.js`; `services/storefrontService.js`; `scripts/backfillShopSlugs.js` (`npm run migrate:slugs`); `PATCH /api/shop/current/storefront`; `PATCH /api/{shoes,clothes}/products/:id/publish`; `routes/publicRoutes.js` + `services/publicService.js` mounted at `/api/public`; `PUBLIC_RATE_MAX`; create/update bodies can no longer set `isPublished`.
- **Fix:** clothes product edit / stock update / delete returned 400 "Unscoped query" (shop-scope guard vs `findById`); now shop-scoped.
- **Portal:** `OnlineStoreCard`, `PublishToggle`, three small API methods; wired into the two Products pages.
- **Store:** `PublicProductList` type, paginated `getShopProducts(slug, query)`, `getProduct`; 2 tests (20 total).
- **Tests/docs:** `tests/publicApi.js` (`test:public`), slug unit tests, route allow-list; docs rewritten from what was run; evidence logs in `docs/evidence/`.
- Contract change vs the Session 1 draft: products list is paginated `{ items, total, page, pageSize }`.
- `.env.example`: CORS wording for a separately deployed Store, `PUBLIC_RATE_MAX`.

## Session 1 — 2026-10-21
- Audited the uploaded management project and the earlier "MarketSuite Session 1" ZIP (a marketing site plus an empty Express skeleton for a different, single-repo plan). The earlier backend skeleton was **not** carried over; its design-shell ideas were reused.
- Created workspace: `management/` (existing project, secrets removed, `.env.example` added), `store/` (new), `docs/`.
- Store shell: routes, layout, design tokens, API client tolerant of the existing `{message, code}` error style, shop list/shop/cart/track/404 pages, state components, 18 tests.
- Wrote API gap analysis and the proposed public API contract.
