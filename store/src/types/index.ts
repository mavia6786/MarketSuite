/**
 * Public API contract (`/api/public/*`, served by the management backend).
 * The shops list, shop and product endpoints were checked against a real backend + MongoDB (see docs/API_INTEGRATION.md).
 * Only fields that are safe to show publicly appear here (never cost price, exact stock, staff, finance data).
 */
export type ShopType = 'Shoes' | 'Clothes';

export interface PublicShop {
  id: string;
  slug: string;
  name: string;
  type: ShopType;
  city: string;
  address?: string;
  phone?: string;
}

export interface PublicShopList {
  items: PublicShop[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  price: number;
  originalPrice: number | null;
  sizes: string[];
  colors: string[];
  imageUrl: string;
  description: string;
  inStock: boolean;
}

/** `GET /api/public/shops/:slug/products` — paginated like the shops list. */
export interface PublicProductList {
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
}

/** Cart item stored in browser localStorage. */
export interface CartItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  shopSlug: string;
  shopName: string;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  city?: string;
  notes?: string;
}

export interface CreateOrderPayload {
  customer: OrderCustomer;
  items: {
    productId: string;
    quantity: number;
    size?: string;
    color?: string;
  }[];
}

export interface PlacedOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice: number | null;
  size?: string;
  color?: string;
  lineTotal: number;
}

export interface PlacedOrder {
  orderNumber: string;
  shopName: string;
  shopSlug: string;
  customer: OrderCustomer;
  itemsCount: number;
  items?: PlacedOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  changedAt: string;
  note?: string;
}

export interface TrackedOrderItem {
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  quantity: number;
  size: string;
  color: string;
  imageUrl: string;
  lineTotal: number;
}

export interface TrackedOrder {
  orderNumber: string;
  shopName: string;
  shopSlug: string;
  shopType: ShopType;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
  customer: OrderCustomer;
  items: TrackedOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}
