import { apiRequest } from '@/services/api';
import type {
  CreateOrderPayload,
  PlacedOrder,
  PublicProduct,
  PublicProductList,
  PublicShop,
  PublicShopList,
  ShopType,
  TrackedOrder,
} from '@/types';

/**
 * Public storefront endpoints, served by the management backend under `/api/public` (see docs/API_INTEGRATION.md).
 * A backend that predates them answers 404 `NOT_FOUND`, which the UI shows as "store service not connected yet";
 * a missing / switched-off shop answers 404 `SHOP_NOT_FOUND`.
 */
export interface ShopQuery {
  q?: string;
  type?: ShopType;
  page?: number;
}

export function getShops(query: ShopQuery, signal?: AbortSignal): Promise<PublicShopList> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.type) params.set('type', query.type);
  if (query.page) params.set('page', String(query.page));
  const qs = params.toString();
  return apiRequest<PublicShopList>(`/public/shops${qs ? `?${qs}` : ''}`, { signal });
}

export function getShop(slug: string, signal?: AbortSignal): Promise<PublicShop> {
  return apiRequest<PublicShop>(`/public/shops/${encodeURIComponent(slug)}`, { signal });
}

export interface ProductQuery {
  q?: string;
  category?: string;
  page?: number;
}

export function getShopProducts(slug: string, query: ProductQuery = {}, signal?: AbortSignal): Promise<PublicProductList> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.page) params.set('page', String(query.page));
  const qs = params.toString();
  return apiRequest<PublicProductList>(`/public/shops/${encodeURIComponent(slug)}/products${qs ? `?${qs}` : ''}`, { signal });
}

export function getShopCategories(slug: string, signal?: AbortSignal): Promise<string[]> {
  return apiRequest<string[]>(`/public/shops/${encodeURIComponent(slug)}/categories`, { signal });
}

export function getProduct(slug: string, id: string, signal?: AbortSignal): Promise<PublicProduct> {
  return apiRequest<PublicProduct>(`/public/shops/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`, { signal });
}

/** Place guest checkout order with Cash on Delivery */
export function createOrder(slug: string, payload: CreateOrderPayload, signal?: AbortSignal): Promise<PlacedOrder> {
  return apiRequest<PlacedOrder>(`/public/shops/${encodeURIComponent(slug)}/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
}

/** Lookup and track customer order by orderNumber + phone */
export function lookupOrder(orderNumber: string, phone: string, signal?: AbortSignal): Promise<TrackedOrder> {
  return apiRequest<TrackedOrder>('/public/orders/lookup', {
    method: 'POST',
    body: JSON.stringify({ orderNumber, phone }),
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
}

/** Liveness of the shared backend. The existing backend answers `{ status: 'ok' }`. */
export function getHealth(signal?: AbortSignal): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health', { signal });
}
