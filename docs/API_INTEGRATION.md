# API integration

Legend: **VERIFIED** = the behaviour was exercised by a test or command that was actually run (stated where). **UNVERIFIED** = designed or implemented but not run in the conditions that matter. **PROPOSED** = designed, not implemented.

"Real MongoDB" below means a local standalone `mongod` 8.3.7 (conda-forge), **not** Atlas and not a replica set. Evidence logs: `docs/evidence/`.

## Existing backend (`management/server`)
- **VERIFIED** Base path `/api`. Routers: `/auth`, `/users`, `/audit-logs`, `/shop`, `/suppliers`, `/shoes`, `/clothes`, `/finance`, **`/public` (new, Session 2)**; `GET /api/health` → `{ "status": "ok" }`.
- **VERIFIED** Errors are `{ "message": "...", "code": "NOT_FOUND|VALIDATION|DUPLICATE|BAD_JSON|TOO_LARGE|SERVER_ERROR|RATE_LIMITED|..." }` — no `{success,data}` envelope on the private API. Unknown `/api/*` → 404 `NOT_FOUND`.
- **VERIFIED** Auth: `POST /api/auth/login` → JWT, `Authorization: Bearer <token>`; 5 roles, permissions in `config/permissions.js`. `npm run test:routes`: 113 routes, 99 guarded, 14 on the allow-list (9 old + the 5 public GETs).
- **VERIFIED (real MongoDB)** `test:probe` with `REAL_MONGO=1`: 37 pass, 0 fail, 2 deferred (payroll, Session 9) — before and after the Session 2 changes. `test:authz`: 42/42 — needs the server started with `AUTH_RATE_MAX=1000` (the default of 30 per 15 min makes the suite hit 429).
- **VERIFIED** CORS: `CORS_ORIGIN` comma list; production with none = same-origin only. In the test run `CORS_ORIGIN=http://localhost:5174`: a simple GET with that `Origin` gets the allow header, an unknown origin gets none. (Preflight/non-simple requests were not tested; the public API only has simple GETs.)
- **VERIFIED** Rate limits: global 600/min/IP (`API_RATE_MAX`), auth `AUTH_RATE_MAX`, **public `PUBLIC_RATE_MAX` (default 120/min/IP)** — the public one was tested with a second server at `PUBLIC_RATE_MAX=5` (429 `RATE_LIMITED`, `/api/health` unaffected). Counters are per process (see `middleware/rateLimit.js`).
- **Minimum MongoDB:** the installed Mongoose 8 / Node driver refuses servers older than MongoDB 4.2 (tried 4.0.3: "maximum wire version 7 … requires at least 8").

## Changes made in Session 2
| Model / area | Change |
| --- | --- |
| `Shop` | `slug` (unique among shops that have one — partial index; `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 60 chars generated), `storefrontEnabled` (default `false`) |
| `ShoeProduct`, `ClothingProduct` | `isPublished` (default `false`) + index `{shopId, isPublished, isActive, createdAt}` |
| Backfill | `npm run migrate:slugs` (dry run) / `-- --yes` (apply). Only adds slugs, never enables a storefront. Run on the seeded DB: 2 shops got `stepup-shoe-store`, `stylehub-clothing`; second run reports nothing to do. |
| Bug fix | Clothes product **edit / stock update / delete** returned 400 `Unscoped query` (the shop-scope guard rejected `findById(id)`); now `findOne({ _id, shopId })`. Reproduced before, covered by `test:public` after. |

## Owner endpoints (authenticated, audited)
- **VERIFIED** `PATCH /api/shop/current/storefront` `{ "storefrontEnabled": boolean }` — permission `shop.edit` (Owner only). Enabling creates the slug if missing; the slug never changes afterwards. Non-boolean → 400 `VALIDATION`. Cashier and Manager → 403.
- **VERIFIED** `PATCH /api/shoes/products/:id/publish` and `/api/clothes/products/:id/publish` `{ "isPublished": boolean }` — permission `products.edit`; scoped to the caller's shop and active products (other shop / unknown id → 404). Cashier → 403.
- **VERIFIED** `isPublished` in a create (`POST`) or update (`PUT`) body is ignored, so it can only change through the publish route. `PUT /api/shop/current` still cannot set `slug`, `storefrontEnabled` or `type`.
- `GET /api/shop/current` now also returns `slug` and `storefrontEnabled` (the portal reads them).

## Public API (`/api/public/*`) — anonymous, read-only
Success body `{ "data": ... }`; errors `{ message, code }`. `Cache-Control: no-cache` (revalidate, so unpublishing/disabling is immediate). Only `GET` exists (other verbs → 404). All of the following are **VERIFIED** by `npm --prefix management/server run test:public` (89 checks, 0 failed, 0 skipped on a fresh seeded real MongoDB, Session 3 run; log in `docs/evidence/session3_test_public_real_mongo.txt`; Session 2's 85-check run is in `session2_*`).

| Endpoint | Result |
| --- | --- |
| `GET /api/public/shops?q=&type=Shoes\|Clothes&page=&pageSize=` | `{ data: { items: PublicShop[], total, page, pageSize } }`; default `pageSize` 12, max 50; `type` is case-insensitive; `q` matches name or city (literal text, max 100 chars) |
| `GET /api/public/shops/:slug` | `{ data: PublicShop }`; unknown / invalid / switched-off / inactive shop → 404 `SHOP_NOT_FOUND` |
| `GET /api/public/shops/:slug/products?q=&category=&page=&pageSize=` | `{ data: { items: PublicProduct[], total, page, pageSize } }`; default `pageSize` 24, max 50; newest first; `category` is an exact, case-insensitive match; switched-off shop → 404 `SHOP_NOT_FOUND` |
| `GET /api/public/shops/:slug/categories` | `{ data: string[] }` — distinct categories of the shop's published, active products, sorted, max 50 (added in Session 3 for the Store's filter chips); switched-off shop → 404 `SHOP_NOT_FOUND` |
| `GET /api/public/shops/:slug/products/:id` | `{ data: PublicProduct }`; unpublished / inactive / other shop's / malformed id → 404 `PRODUCT_NOT_FOUND` |

Invalid input (`q` not text e.g. `?q[$ne]=x` or repeated, over-long, bad `type`, `page` < 1 or non-numeric, `pageSize` > 50) → 400 `VALIDATION`, never 500.

**Deviation from the Session 1 draft:** the products list is paginated (`{ items, total, page, pageSize }`) instead of a bare array, so the Store can page. The Store client/types were updated accordingly.

**Visibility rules** (`services/publicService.js`): a shop is public only if `storefrontEnabled === true`, `isActive !== false`, has a slug and type `Shoes`/`Clothes`; a product only if it belongs to that shop (every query carries `shopId`, so the shop-scope guard stays ON), `isPublished` and `isActive`.

**Output** is built field by field:
- `PublicShop`: `id, slug, name, type, city, address, phone` (strings are `''` when empty). Switching the online store on therefore makes the shop's name, type, city, address and phone public (the portal card says so). Owner name and email are never returned.
- `PublicProduct` (identical for both shop types): `id, name, brand, category, subCategory, price, originalPrice, sizes[], colors[], imageUrl, description, inStock`.
  - Shoes: `price`/`originalPrice` from the product (`originalPrice` only if higher than `price`, else `null`); `sizes`/`colors` from the comma lists.
  - Clothes: `price` = effective price (discounted if valid), `originalPrice` = selling price when discounted else `null`; `sizes`/`colors` = the single size / colour if set; `subCategory` is `''` (clothing `gender` is not exposed yet — additive change if Session 3 needs it).
  - `imageUrl` is passed on only if it starts with `http://` or `https://`, otherwise `''`.
  - Never returned (checked recursively in the tests): `costPrice`, exact `stockQuantity`, `lowStockThreshold`, `sku`, `shopId`, `isActive`, `isPublished`, timestamps, owner/staff/user/finance fields.
- `Shop` `id`s are MongoDB ObjectIds (opaque, not secret).

**Tenant isolation (VERIFIED):** a product id from shop A under shop B's slug → 404, for different shop types and for two shops of the same type; the second shop with the same name gets slug `<name>-2`.

**Not verified / limits:** Atlas; replica-set transactions (not used by these routes); production mode (`NODE_ENV=production`); behaviour under concurrent "enable storefront" calls for the same shop (the code retries on a slug collision, but no concurrency test was written); search uses case-insensitive regex without a text index (fine for small catalogues; revisit if catalogues grow).

## Still to come
## Online Orders API (Sessions 4 & 5) — VERIFIED

### Public Endpoints (`/api/public/*`)
- **`POST /api/public/shops/:slug/orders`**:
  - Guest checkout with Cash on Delivery (COD).
  - Validates customer fields (`name`, `phone`, `address`, `city`).
  - Server validates published/active status, re-prices directly from the database (client prices are ignored), and atomically decrements stock with rollback on failure.
  - Generates unique order number (e.g. `ORD-XXXXXX-XXXX`).
  - Returns `{ success: true, data: { orderNumber, total, status, itemsCount } }`.
- **`POST /api/public/orders/lookup`**:
  - Secure customer order tracking. Requires `{ orderNumber, phone }` exact match.
  - Returns full public order tracking details including live status (`Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`), items breakdown, and status timeline.

### Management Portal Endpoints (`/api/online-orders`)
- Guarded by `sales.view` permission (scoped to active shop):
  - `GET /api/online-orders`: Paginated list of shop orders with status/search filtering (`?q=&status=&page=&pageSize=`).
  - `GET /api/online-orders/:id`: Full order details.
  - `PATCH /api/online-orders/:id/status`: Updates order status (e.g. to `Confirmed`, `Shipped`, `Delivered`, or `Cancelled`). When an order is cancelled, reserved stock is automatically and atomically restored to inventory.

## Storefront Integration
- Store provides single-shop cart with localStorage persistence.
- Add to cart with variant selections and quantity selectors.
- Cross-shop cart conflict prevention with interactive user confirmation modal.
- Guest Cash on Delivery checkout page with validation and stock error handling.
- Real-time order tracking page (`/track`) with visual progress stepper.

