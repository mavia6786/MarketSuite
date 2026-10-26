import { Route, Routes } from 'react-router-dom';
import { StoreLayout } from '@/layouts/StoreLayout';
import HomePage from '@/pages/HomePage';
import ShopsPage from '@/pages/ShopsPage';
import ShopPage from '@/pages/ShopPage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import TrackOrderPage from '@/pages/TrackOrderPage';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { CartProvider } from '@/context/CartContext';

/**
 * Customer-facing routes:
 *   /                          home
 *   /shops                     shop directory (search + type filter)
 *   /shop/:slug                one shop's storefront
 *   /shop/:slug/product/:id    product detail (with add-to-cart)
 *   /cart                      cart & guest checkout (COD)
 *   /orders/confirmation/:orderNumber  order placed confirmation
 *   /orders/track              customer order tracking
 */
export function AppRoutes() {
  return (
    <CartProvider>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="shop/:slug" element={<ShopPage />} />
          <Route path="shop/:slug/product/:id" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders/confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="orders/confirmation" element={<OrderConfirmationPage />} />
          <Route path="orders/track" element={<TrackOrderPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </CartProvider>
  );
}
