import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Phone, Search, XCircle, AlertCircle } from 'lucide-react';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { lookupOrder } from '@/services/publicApi';
import { formatPKR } from '@/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { OrderStatus, TrackedOrder } from '@/types';

const STATUS_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'Pending', label: 'Order Placed', desc: 'Received by merchant' },
  { status: 'Confirmed', label: 'Confirmed', desc: 'Preparing package' },
  { status: 'Shipped', label: 'On the Way', desc: 'Dispatched for delivery' },
  { status: 'Delivered', label: 'Delivered', desc: 'Package delivered & COD received' },
];

function statusStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'Pending':
      return 0;
    case 'Confirmed':
      return 1;
    case 'Shipped':
      return 2;
    case 'Delivered':
      return 3;
    case 'Cancelled':
      return -1;
    default:
      return 0;
  }
}

export default function TrackOrderPage() {
  usePageMeta('Track your order');
  const [searchParams] = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('number') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError('Please enter both your Order Number and Phone Number.');
      return;
    }

    setError(null);
    setLoading(true);
    setOrder(null);

    try {
      const res = await lookupOrder(orderNumber.trim(), phone.trim());
      setOrder(res);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Could not find an order matching that number and phone. Please verify and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialNum = searchParams.get('number')?.trim();
    const initialPhone = searchParams.get('phone')?.trim();
    if (!initialNum || !initialPhone) return;

    let cancelled = false;
    lookupOrder(initialNum, initialPhone)
      .then((res) => {
        if (!cancelled) {
          setOrder(res);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String(err.message)
              : 'Could not find an order matching that number and phone. Please verify and try again.';
          setError(msg);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const currentIndex = order ? statusStepIndex(order.status) : 0;
  const isCancelled = order?.status === 'Cancelled';

  return (
    <Container className="py-8 sm:py-10 max-w-4xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Track your order</h1>
        <p className="mt-2 text-muted">
          Check live delivery status and details for your online purchase.
        </p>
      </div>

      {/* Search Form */}
      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-7 shadow-sm">
        <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-5">
            <label htmlFor="track-number" className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Order Number
            </label>
            <input
              id="track-number"
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ORD-00001"
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono uppercase"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="track-phone" className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Phone Number
            </label>
            <input
              id="track-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0300 1234567"
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="sm:col-span-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center py-2.5 font-semibold"
            >
              {loading ? (
                'Looking up...'
              ) : (
                <>
                  <Search size={16} className="mr-2" aria-hidden="true" />
                  Track Order
                </>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Order Status Display */}
      {order && (
        <div className="mt-8 space-y-6">
          {/* Order Header Card */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">Order Number</span>
                <h2 className="font-mono text-2xl font-bold text-ink">{order.orderNumber}</h2>
                <p className="mt-1 text-sm text-muted">
                  Purchased from{' '}
                  <Link to={`/shop/${order.shopSlug}`} className="font-semibold text-brand hover:underline">
                    {order.shopName}
                  </Link>{' '}
                  on {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink">
                  {order.paymentMethod} (Pay on delivery)
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isCancelled
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : order.status === 'Delivered'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-brand/10 text-brand'
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>

            {/* Tracking Progress Stepper */}
            {isCancelled ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <XCircle size={22} className="shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Order Cancelled</h3>
                  <p className="mt-1 text-sm">
                    {order.cancelReason || 'This order was cancelled by the merchant.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = currentIndex >= idx;
                    const isCurrent = currentIndex === idx;

                    return (
                      <div key={step.status} className="flex flex-col items-center text-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                            isDone
                              ? 'border-brand bg-brand text-white'
                              : 'border-line bg-surface-2 text-muted'
                          } ${isCurrent ? 'ring-4 ring-brand/20' : ''}`}
                        >
                          {isDone ? <CheckCircle2 size={20} /> : <Circle size={16} />}
                        </div>
                        <h4 className={`mt-2 text-sm font-semibold ${isDone ? 'text-ink' : 'text-muted'}`}>
                          {step.label}
                        </h4>
                        <p className="text-xs text-muted max-w-[120px]">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* Items */}
            <div className="md:col-span-7 rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
              <h3 className="font-bold text-lg border-b border-line pb-3">Items in Order</h3>
              <ul className="divide-y divide-line mt-3">
                {order.items.map((it, idx) => (
                  <li key={idx} className="py-3 flex justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-ink">{it.name}</p>
                      {it.brand && <p className="text-xs text-muted">{it.brand}</p>}
                      <div className="flex gap-2 text-xs text-muted mt-0.5">
                        {it.size && <span>Size: {it.size}</span>}
                        {it.color && <span>Color: {it.color}</span>}
                        <span>Qty: {it.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink">{formatPKR(it.lineTotal)}</p>
                      <p className="text-xs text-muted">{formatPKR(it.price)} each</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-line mt-4 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>{formatPKR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Delivery (COD)</span>
                  <span className="text-emerald-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between font-bold text-base text-ink pt-1.5 border-t border-line">
                  <span>Total</span>
                  <span className="text-brand">{formatPKR(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery address & Contact */}
            <div className="md:col-span-5 rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-lg border-b border-line pb-3">Delivery Information</h3>
                <div className="mt-3 text-sm space-y-1">
                  <p className="font-semibold text-ink">{order.customer.name}</p>
                  <p className="text-muted flex items-center gap-1.5">
                    <Phone size={14} /> {order.customer.phone}
                  </p>
                  <p className="text-muted whitespace-pre-line mt-2">{order.customer.address}</p>
                  {order.customer.city && <p className="text-muted">{order.customer.city}</p>}
                </div>
              </div>

              {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="border-t border-line pt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Activity History</h4>
                  <ul className="mt-2 space-y-2 text-xs">
                    {order.statusHistory.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted">
                        <Clock size={13} className="shrink-0 mt-0.5 text-brand" />
                        <div>
                          <span className="font-semibold text-ink">{h.status}</span> —{' '}
                          {new Date(h.changedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          {h.note && <p className="text-muted italic mt-0.5">{h.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
