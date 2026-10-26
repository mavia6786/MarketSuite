# Architecture

```
Customer ──> store/ (React SPA) ──HTTPS /api/public/*──> management/server (Express) ──> MongoDB (single source of truth)
Owner    ──> management/client (React SPA) ──HTTPS /api/*──────────┘
```

## Decisions
1. **Two frontends, one backend, one database.** The Store has no database and no business data of its own. Products, prices, stock, shops and orders live in the management backend's MongoDB, so the portal and Store can never disagree.
2. **The backend is extended, not rebuilt.** The existing backend got a small, separate *public* module (`/api/public/*`, `routes/publicRoutes.js` → `services/publicService.js`, Session 2) and will get an online-order module (Session 4). Existing routes, models and auth keep working unchanged.
3. **Public vs private.** Public routes need no login, return only a whitelisted set of fields (never `costPrice`, staff, finance, audit), and only for shops with `storefrontEnabled` and products with `isPublished`. Owner authentication (JWT, RBAC) is untouched.
4. **Tenant safety.** The backend has a global Mongoose "shop scope" plugin that throws if a query on a `shopId` model has no `shopId` filter (`management/server/plugins/shopScope.js`). Every public query must filter by the shop resolved from the slug. Cross-shop tests are mandatory and exist (`management/server/tests/publicApi.js`).
5. **Money.** Stored as rupees with 2 decimals; arithmetic only via `management/server/utils/money.js` (integer-paisa helpers). The Store only *displays* prices; totals are computed by the server.
6. **Stock.** Single `stockQuantity` per product (no per-size stock) — accepted limitation for now. Online orders must decrement stock atomically (conditional `findOneAndUpdate`, as POS does) so they cannot oversell.
7. **Checkout.** Guest checkout, Cash on Delivery only (defaults chosen in planning). No customer accounts yet.
8. **Shoes and clothes are separate collections** (`ShoeProduct`, `ClothingProduct`; separate sale models). The public API normalises both into one `PublicProduct` shape.

## Data ownership
| Data | Owner |
| --- | --- |
| Shops, products, stock, prices | management backend (portal edits them) |
| Public storefront settings (`Shop.slug`, `Shop.storefrontEnabled`) and per-product `isPublished` | management backend; changed only by the owner through `PATCH /api/shop/current/storefront` (`shop.edit`) and `PATCH .../products/:id/publish` (`products.edit`) |
| Online orders | management backend (new model, Session 4); visible in portal |
| Cart | browser only (Store), validated server-side at checkout |

## Public visibility in one line
Shop visible ⇔ `storefrontEnabled` ∧ `isActive` ∧ has slug. Product visible ⇔ its shop is visible ∧ `shopId` matches ∧ `isPublished` ∧ `isActive`. Everything the public sees is whitelisted field by field; details in `docs/API_INTEGRATION.md`.

## Store pages (Session 3)
`/shops`, `/shop/:slug` (products with search/category/pages, state in the URL), `/shop/:slug/product/:id`. Data comes only from `/api/public/*` through `store/src/services/publicApi.ts`; the Store keeps no data of its own (no database, no product copy). Cart (Session 4) and tracking (Session 5) pages are still placeholders.
