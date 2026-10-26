import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { Container } from '@/components/Container';
import { Button, ButtonLink } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
import { StateNotice } from '@/components/StateNotice';
import { useCart } from '@/context/CartContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { createOrder } from '@/services/publicApi';
import { formatPKR } from '@/utils/format';
import type { PlacedOrder } from '@/types';

export default function CartPage() {
  usePageMeta('Cart');
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, subtotal, activeShopSlug, activeShopName } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Container className="py-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Your cart</h1>
        <div className="mt-8">
          <StateNotice title="Your cart is empty" action={<ButtonLink to="/shops">Find a shop</ButtonLink>}>
            Items you add from a shop will show up here.
          </StateNotice>
        </div>
      </Container>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopSlug) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          city: customerCity || undefined,
          notes: customerNotes || undefined,
        },
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          size: it.size || undefined,
          color: it.color || undefined,
        })),
      };

      const placedOrder: PlacedOrder = await createOrder(activeShopSlug, orderPayload);
      clearCart();
      navigate(`/orders/confirmation/${encodeURIComponent(placedOrder.orderNumber)}`, {
        state: { order: placedOrder },
      });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Failed to place order. Please check your information and try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-line pb-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Your Cart</h1>
          {activeShopName && (
            <p className="mt-1 text-sm text-muted">
              Ordering from{' '}
              <Link to={`/shop/${activeShopSlug}`} className="font-semibold text-brand hover:underline">
                {activeShopName}
              </Link>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-semibold text-muted hover:text-danger flex items-center gap-1 self-start sm:self-auto"
        >
          <Trash2 size={14} /> Clear all items
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Cart items list */}
        <div className="lg:col-span-7 space-y-4">
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface" aria-label="Cart items">
            {items.map((item) => {
              const lineTotal = item.price * item.quantity;
              return (
                <li key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-4 p-4 sm:p-5">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                    <ProductImage src={item.imageUrl} name={item.name} className="h-full w-full object-cover" />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex justify-between">
                        <Link
                          to={`/shop/${item.shopSlug}/product/${item.productId}`}
                          className="font-semibold text-ink hover:text-brand transition-colors text-base"
                        >
                          {item.name}
                        </Link>
                        <span className="font-bold text-ink sm:text-lg">{formatPKR(lineTotal)}</span>
                      </div>

                      {item.brand && <p className="text-xs text-muted">{item.brand}</p>}

                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                        {item.size && <span className="rounded bg-surface-2 px-2 py-0.5 font-medium">Size: {item.size}</span>}
                        {item.color && <span className="rounded bg-surface-2 px-2 py-0.5 font-medium">Color: {item.color}</span>}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-line bg-surface-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                          aria-label={`Decrease quantity for ${item.name}`}
                          className="p-1.5 text-muted hover:text-ink"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                          disabled={item.quantity >= 10}
                          aria-label={`Increase quantity for ${item.name}`}
                          className="p-1.5 text-muted hover:text-ink disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">{formatPKR(item.price)} each</span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.size, item.color)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="text-muted hover:text-danger p-1 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
            <Truck size={18} className="shrink-0 text-brand" />
            <span>Pay with <strong>Cash on Delivery</strong> when your order arrives at your doorstep.</span>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCheckout}
            className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-5"
          >
            <h2 className="text-xl font-bold">Checkout Information</h2>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div>
                <label htmlFor="customerName" className="block font-semibold text-ink">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Muhammad Ali"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="block font-semibold text-ink">
                  Phone Number <span className="text-danger">*</span>
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <span className="mt-1 block text-xs text-muted">Used for delivery updates & order tracking</span>
              </div>

              <div>
                <label htmlFor="customerAddress" className="block font-semibold text-ink">
                  Delivery Address <span className="text-danger">*</span>
                </label>
                <textarea
                  id="customerAddress"
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, House/Apartment #, Area"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label htmlFor="customerCity" className="block font-semibold text-ink">
                  City
                </label>
                <input
                  id="customerCity"
                  type="text"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  placeholder="e.g. Lahore, Karachi, Islamabad"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label htmlFor="customerNotes" className="block font-semibold text-ink">
                  Delivery Notes (Optional)
                </label>
                <input
                  id="customerNotes"
                  type="text"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="e.g. Call before arrival"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-line pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE (COD)</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
                <span>Total to Pay</span>
                <span className="text-xl text-brand">{formatPKR(subtotal)}</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full justify-center py-3 text-base font-semibold"
            >
              {isSubmitting ? (
                'Placing Order...'
              ) : (
                <>
                  <ShoppingBag size={18} className="mr-2" aria-hidden="true" />
                  Place Order (Cash on Delivery)
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted">
              By placing your order, you agree to inspect and pay for the items upon delivery.
            </p>
          </form>
        </div>
      </div>
    </Container>
  );
}
