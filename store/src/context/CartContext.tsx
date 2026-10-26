import React, { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem } from '@/types';

interface AddItemResult {
  success: boolean;
  mismatch?: {
    currentShop: string;
    newShop: string;
  };
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }, forceReplace?: boolean) => AddItemResult;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  activeShopSlug: string | null;
  activeShopName: string | null;
}

const STORAGE_KEY = 'marketsuite_store_cart';

const CartContext = createContext<CartContextValue | null>(null);

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (it) => it && typeof it === 'object' && it.productId && it.shopSlug && typeof it.quantity === 'number'
      );
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const activeShopSlug = items.length > 0 ? (items[0]?.shopSlug ?? null) : null;
  const activeShopName = items.length > 0 ? (items[0]?.shopName ?? null) : null;

  const addItem = (
    item: Omit<CartItem, 'quantity'> & { quantity?: number },
    forceReplace = false
  ): AddItemResult => {
    const qty = Math.max(1, Math.min(10, item.quantity || 1));
    const size = item.size || '';
    const color = item.color || '';

    const firstItem = items[0];
    if (firstItem && firstItem.shopSlug !== item.shopSlug && !forceReplace) {
      return {
        success: false,
        mismatch: {
          currentShop: firstItem.shopName || firstItem.shopSlug,
          newShop: item.shopName || item.shopSlug,
        },
      };
    }

    setItems((prev) => {
      const first = prev[0];
      const baseList = forceReplace && first && first.shopSlug !== item.shopSlug ? [] : prev;
      const idx = baseList.findIndex(
        (it) => it.productId === item.productId && it.size === size && it.color === color
      );

      if (idx >= 0 && baseList[idx]) {
        const next = [...baseList];
        const current = next[idx]!;
        const newQty = Math.min(10, current.quantity + qty);
        next[idx] = { ...current, quantity: newQty };
        return next;
      }

      return [
        ...baseList,
        {
          productId: item.productId,
          name: item.name,
          brand: item.brand || '',
          price: item.price,
          originalPrice: item.originalPrice ?? null,
          imageUrl: item.imageUrl || '',
          size,
          color,
          quantity: qty,
          shopSlug: item.shopSlug,
          shopName: item.shopName,
        },
      ];
    });

    return { success: true };
  };

  const updateQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, size, color);
      return;
    }
    const safeQty = Math.min(10, Math.max(1, quantity));
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId && it.size === size && it.color === color) {
          return { ...it, quantity: safeQty };
        }
        return it;
      })
    );
  };

  const removeItem = (productId: string, size: string, color: string) => {
    setItems((prev) =>
      prev.filter(
        (it) => !(it.productId === productId && it.size === size && it.color === color)
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
        activeShopSlug,
        activeShopName,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
