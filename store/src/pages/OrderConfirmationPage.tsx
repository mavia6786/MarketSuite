import { useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Truck } from 'lucide-react';
import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/Button';
import { formatPKR } from '@/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { PlacedOrder } from '@/types';

export default function OrderConfirmationPage() {
  const { orderNumber: paramNumber } = useParams();
  const location = useLocation();
  const order = (location.state as { order?: PlacedOrder })?.order;
  const orderNumber = order?.orderNumber || paramNumber || '';

  usePageMeta(orderNumber ? `Order ${orderNumber} Confirmed` : 'Order Confirmation');

  return (
    <Container className="py-10 max-w-3xl">
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-10 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 size={36} aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight">Order Placed Successfully!</h1>
        <p className="mt-2 text-muted max-w-md mx-auto">
          Thank you for shopping. Your order has been placed with Cash on Delivery and is being processed by the merchant.
        </p>

        {orderNumber && (
          <div className="mt-6 inline-flex flex-col items-center justify-center rounded-xl border border-line bg-surface-2 px-6 py-4">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">Your Order Number</span>
            <span className="mt-1 font-mono text-2xl font-bold text-brand">{orderNumber}</span>
            <span className="mt-1 text-xs text-muted">Save this number to track your delivery status</span>
          </div>
        )}

        {order && (
          <div className="mt-8 text-left rounded-xl border border-line bg-canvas p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-semibold text-ink">Shop: {order.shopName}</span>
              <span className="rounded bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Cash on Delivery
              </span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-muted">Delivery Address</p>
                <p className="mt-1 text-ink">{order.customer.name}</p>
                <p className="text-muted">{order.customer.phone}</p>
                <p className="text-muted whitespace-pre-line">{order.customer.address}</p>
                {order.customer.city && <p className="text-muted">{order.customer.city}</p>}
              </div>
              <div className="sm:text-right">
                <p className="font-semibold text-muted">Summary</p>
                <p className="mt-1 text-ink">{order.itemsCount} item(s)</p>
                <p className="text-muted">Delivery: Free (COD)</p>
                <p className="mt-2 text-lg font-bold text-ink">Total: {formatPKR(order.total)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <ButtonLink to={`/orders/track?number=${encodeURIComponent(orderNumber)}`} className="w-full sm:w-auto">
            <Truck size={18} className="mr-2" aria-hidden="true" />
            Track Order Status
          </ButtonLink>
          <ButtonLink to="/shops" variant="secondary" className="w-full sm:w-auto">
            <ShoppingBag size={18} className="mr-2" aria-hidden="true" />
            Continue Shopping
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
