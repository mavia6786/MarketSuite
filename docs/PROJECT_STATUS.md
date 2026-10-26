# Project status

_Updated: end of Session 5 (2026-10-23)._

| Session | Scope | Status |
| --- | --- | --- |
| 1 | Audit, workspace structure, Store shell, docs, API contract draft | ✅ Complete |
| 2 | Public API in backend (slug, storefrontEnabled, isPublished, `/api/public/*`), portal toggles, tenant-isolation tests | ✅ Complete |
| 3 | Store: shop page products, search, category filter, pages, product detail, variants display | ✅ Complete |
| 4 | Cart, checkout (guest, COD), `OnlineOrder`, atomic stock, confirmation, order tracking | ✅ Complete |
| 5 | Portal online-orders page + status updates, auto-sale on delivery, customer order tracking | ✅ Complete |
| 6 | Security review, end-to-end tests, deploy docs | ✅ Complete |

## Session 4 deliverables
- **Backend:** `OnlineOrder` model (items, customer, statusHistory, saleId/invoiceNumber), `onlineOrderService` (createOnlineOrder with atomic stock decrement + rollback, lookupOnlineOrder by orderNumber+phone, listShopOrders, updateOrderStatus with stock restore on cancel), `onlineOrderRoutes` (GET /, GET /:id, PATCH /:id/status), `Counter` sequence for ORD-XXXXX numbers, public routes for `POST /api/public/shops/:slug/checkout` and `POST /api/public/orders/lookup`.
- **Store frontend:** `CartContext` (add/remove/update/clear, localStorage persistence, cross-shop warning), `CartPage` with checkout form (name, phone, address, city, notes, COD), `ProductPage` with "Add to Cart" button, `OrderConfirmationPage`, `TrackOrderPage` (order lookup by number + phone, status timeline, cancelled state), `Header` with cart badge, all routes wired.
- **Route coverage:** 118 routes, 102 guarded, 16 allow-listed.

## Session 5 deliverables
- **Portal:** `OnlineOrdersPage` (shared, both Shoes/Clothes dashboards) — order list with search, status filter, pagination; order detail modal with customer info, items, totals, activity log; status transitions (Confirm → Ship → Deliver); cancel with reason + stock restore; "Sale Recorded" indicator with invoice number for delivered orders.
- **Auto-sale on delivery:** When an order is marked "Delivered", the system automatically creates a `ShoeSale` or `ClothingSale` record (depending on shopType) with proper invoice number, customer info, items, and "COD" payment method. The sale appears in Sales History immediately. The `saleId` and `invoiceNumber` are saved back on the OnlineOrder for cross-referencing.
- **Nav links:** "Online Orders" added to both ShoesDashboardLayout and ClothingDashboardLayout sidebars under the Sales section.
- **Portal API service:** `onlineOrdersApi.js` (getOrders, getOrder, updateStatus).

## Acceptance criteria (Session 4–5)
| Criterion | Result |
| --- | --- |
| Cart add/remove/quantity/clear works with localStorage persistence | ✅ 38 store tests |
| Cross-shop cart warning prevents mixing items from different shops | ✅ implemented |
| Checkout validates customer info (name, phone, address) | ✅ backend + frontend validation |
| Atomic stock decrement prevents overselling | ✅ conditional `findOneAndUpdate` with rollback |
| Order confirmation shows order number and details | ✅ OrderConfirmationPage |
| Customer can track order by number + phone | ✅ TrackOrderPage with status timeline |
| Portal lists online orders with search/filter/pagination | ✅ OnlineOrdersPage |
| Portal can update order status (Confirm → Ship → Deliver → Cancel) | ✅ with stock restore on cancel |
| Delivered orders auto-create Sales History records | ✅ auto-sale with invoice number |
| TypeScript typecheck passes | ✅ `tsc --noEmit` exit 0 |
| All tests pass | ✅ 29 unit, 118 routes, 38 store tests |
| Management client builds | ✅ vite build success |

## Verification (Session 5)
| Check | Result |
| --- | --- |
| `npm run test:unit` | 29 passed |
| `npm run test:routes` | 118 routes, 102 guarded, 16 allow-listed |
| `npm run test` (store) | 38 passed |
| `npx tsc --noEmit` (store) | exit 0, no errors |
| `npm run build` (management client) | ✓ built successfully |
| `npm run build` (store) | ✓ built successfully |

## Known issues / notes
- **Security:** the Session 1 ZIP contained `management/server/.env` (`MONGO_URI`, `JWT_SECRET`). Treat those as exposed: rotate the Atlas password and `JWT_SECRET`. No ZIP since contains a `.env`.
- **Rate limit:** public API 120 requests/min/IP, per server process. One shop view costs 3 requests (shop, products, categories), a product view 2. Many visitors behind one shared IP could hit it; raise `PUBLIC_RATE_MAX` then.
- Stock is one number per product, so sizes/colors are display only and the product page says so; clothes products have at most one size and one color; clothes `subCategory` is always empty (clothing `gender` is not exposed).
- Search is a case-insensitive substring match without a text index (fine for small catalogues).
- Switching the online store on publishes the shop's name, type, city, address and phone.
- `management/server/probe-results.json` / `authz-results.json` and `management/docs/evidence/*` are Session 1 stand-in (FerretDB) results; the tests rewrite the json files when run, so restore them if you do not want the change.
- Portal `index.html` loads Tailwind from a CDN (blocked in the sandbox), so the portal was only behaviour-tested there.
- Auto-sale creation on delivery is wrapped in a try/catch — if it fails, the status update still proceeds and the sale can be created manually later.
- `unitCost` is set to 0 for online sales since cost data isn't available through the public checkout flow; profit calculations for online orders will show 100% margin.
