import { createContext, useContext, useState, useCallback } from 'react';

const ShoeCartContext = createContext(null);

export function ShoeCartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((newItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === newItem.productId && i.size === newItem.size && i.color === newItem.color);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + newItem.quantity };
        return copy;
      }
      return [...prev, newItem];
    });
  }, []);

  const updateQuantity = useCallback((productId, size, color, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => !(i.productId === productId && i.size === size && i.color === color));
      return prev.map((i) => (i.productId === productId && i.size === size && i.color === color ? { ...i, quantity } : i));
    });
  }, []);

  const removeItem = useCallback((productId, size, color) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size && i.color === color)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <ShoeCartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, subTotal, itemCount }}>
      {children}
    </ShoeCartContext.Provider>
  );
}

export function useShoeCart() {
  return useContext(ShoeCartContext);
}
