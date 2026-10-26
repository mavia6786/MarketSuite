import { createContext, useContext, useState, useCallback } from 'react';

const ClothingCartContext = createContext(null);

const same = (i, productId, size, color) => i.productId === productId && i.size === size && i.color === color;

export function ClothingCartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxRatePercent, setTaxRatePercent] = useState(0);

  const subTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalDiscount = Math.min(discount, subTotal);
  const taxAmount = subTotal * (taxRatePercent / 100);
  const grandTotal = subTotal - totalDiscount + taxAmount;

  // product = ClothingProduct document from the API
  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => same(i, product._id, product.size, product.color));
      if (idx >= 0) {
        const copy = [...prev];
        const q = copy[idx].quantity + quantity;
        copy[idx] = { ...copy[idx], quantity: q, lineTotal: q * copy[idx].unitPrice };
        return copy;
      }
      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          size: product.size,
          color: product.color,
          quantity,
          unitPrice: product.effectivePrice,
          lineTotal: quantity * product.effectivePrice,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId, size, color) => {
    setItems((prev) => prev.filter((i) => !same(i, productId, size, color)));
  }, []);

  const updateQuantity = useCallback(
    (productId, size, color, quantity) => {
      if (quantity <= 0) return removeItem(productId, size, color);
      setItems((prev) =>
        prev.map((i) => (same(i, productId, size, color) ? { ...i, quantity, lineTotal: quantity * i.unitPrice } : i))
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
  }, []);

  const applyDiscount = useCallback((amount) => setDiscount(Math.max(0, Number(amount) || 0)), []);

  // Mirrors ClothingCartService.BuildSale
  const buildSale = useCallback(
    (customerName, customerPhone, customerEmail, paymentMethod, amountPaid, salesmanName, notes) => ({
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      amountPaid,
      salesmanName,
      notes,
      subTotal,
      discountAmount: totalDiscount,
      taxAmount,
      totalAmount: grandTotal,
      totalItemCount: totalItems,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
    }),
    [items, subTotal, totalDiscount, taxAmount, grandTotal, totalItems]
  );

  return (
    <ClothingCartContext.Provider
      value={{ items, totalItems, subTotal, totalDiscount, taxAmount, grandTotal, taxRatePercent, setTaxRatePercent, addItem, removeItem, updateQuantity, clearCart, applyDiscount, buildSale }}
    >
      {children}
    </ClothingCartContext.Provider>
  );
}

export function useClothingCart() {
  return useContext(ClothingCartContext);
}
