import { useCallback, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, ChevronLeft, MapPin, Minus, Phone, Plus, ShoppingBag, X } from 'lucide-react';
import { Container } from '@/components/Container';
import { Button, ButtonLink } from '@/components/Button';
import { Price } from '@/components/Price';
import { ProductImage } from '@/components/ProductImage';
import { ApiErrorNotice, StateNotice } from '@/components/StateNotice';
import { useRemote } from '@/hooks/useRemote';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getProduct, getShop } from '@/services/publicApi';
import { useCart } from '@/context/CartContext';

/** The shop page passes its own search string so "back" returns to the same results; anything else is ignored. */
function backSearch(state: unknown): string {
  const back = state && typeof state === 'object' ? (state as { back?: unknown }).back : undefined;
  return typeof back === 'string' && back.startsWith('?') && back.length <= 200 ? back : '';
}

function SelectableChips({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted">{label}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {values.map((v) => {
          const isSelected = selected === v;
          return (
            <li key={v}>
              <button
                type="button"
                onClick={() => onSelect(isSelected ? '' : v)}
                aria-pressed={isSelected}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-brand bg-brand/10 text-brand ring-1 ring-brand font-semibold'
                    : 'border-line bg-surface hover:bg-surface-2 text-ink'
                }`}
              >
                {v}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ProductPage() {
  const { slug = '', id = '' } = useParams();
  const { state: routeState } = useLocation();
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);
  const [mismatch, setMismatch] = useState<{ currentShop: string; newShop: string } | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) =>
      Promise.all([getProduct(slug, id, signal), getShop(slug, signal)]).then(([product, shop]) => ({
        product,
        shop,
      })),
    [slug, id],
  );

  const { state, retry } = useRemote(loader);

  usePageMeta(
    state.status === 'ok' ? `${state.data.product.name} — ${state.data.shop.name}` : 'Product',
    state.status === 'ok' ? state.data.product.description.slice(0, 160) || undefined : undefined,
  );

  const shopHref = `/shop/${encodeURIComponent(slug)}${backSearch(routeState)}`;

  if (state.status === 'loading') {
    return (
      <Container className="py-10">
        <div aria-busy="true" aria-label="Loading product" className="grid gap-8 md:grid-cols-2">
          <div className="st-skeleton aspect-square rounded-xl" />
          <div className="st-skeleton h-72 rounded-xl" />
        </div>
      </Container>
    );
  }

  if (state.status === 'error') {
    const { error } = state;
    return (
      <Container className="py-10">
        {error.status === 404 && error.code === 'PRODUCT_NOT_FOUND' ? (
          <StateNotice
            title="This product isn’t available"
            action={<ButtonLink to={shopHref} variant="secondary">See the shop’s products</ButtonLink>}
          >
            It may have been removed or taken offline by the shop.
          </StateNotice>
        ) : error.status === 404 && error.code === 'SHOP_NOT_FOUND' ? (
          <StateNotice
            title="Shop not found"
            action={<ButtonLink to="/shops" variant="secondary">Browse all shops</ButtonLink>}
          >
            This shop doesn’t exist, or its online store is switched off.
          </StateNotice>
        ) : (
          <ApiErrorNotice error={error} onRetry={retry} />
        )}
      </Container>
    );
  }

  const { product, shop } = state.data;
  const where = [shop.address, shop.city].filter(Boolean).join(', ');

  const handleAddToCart = (force = false) => {
    const res = addItem(
      {
        productId: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl: product.imageUrl,
        size: selectedSize || (product.sizes.length === 1 ? (product.sizes[0] ?? '') : ''),
        color: selectedColor || (product.colors.length === 1 ? (product.colors[0] ?? '') : ''),
        quantity,
        shopSlug: shop.slug,
        shopName: shop.name,
      },
      force
    );

    if (!res.success && res.mismatch) {
      setMismatch(res.mismatch);
      return;
    }

    setMismatch(null);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3000);
  };

  return (
    <Container className="py-8 sm:py-10">
      <Link to={shopHref} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <ChevronLeft size={16} aria-hidden="true" />
        {shop.name}
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-2 md:gap-10">
        <ProductImage src={product.imageUrl} name={product.name} eager className="rounded-xl border border-line" />

        <div className="flex flex-col gap-6">
          <div>
            {product.brand && <p className="text-muted">{product.brand}</p>}
            <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{product.name}</h1>
            {(product.category || product.subCategory) && (
              <p className="mt-2 text-sm text-muted">
                {[product.category, product.subCategory].filter(Boolean).join(' / ')}
              </p>
            )}
          </div>

          <Price price={product.price} originalPrice={product.originalPrice} large />

          <p
            className={
              product.inStock
                ? 'flex items-center gap-1.5 font-semibold text-success'
                : 'flex items-center gap-1.5 font-semibold text-danger'
            }
          >
            {product.inStock ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
            {product.inStock ? 'In stock' : 'Out of stock'}
          </p>

          {product.sizes.length > 0 && (
            <SelectableChips
              label={product.sizes.length === 1 ? 'Size' : 'Sizes'}
              values={product.sizes}
              selected={selectedSize}
              onSelect={setSelectedSize}
            />
          )}

          {product.colors.length > 0 && (
            <SelectableChips
              label={product.colors.length === 1 ? 'Color' : 'Colors'}
              values={product.colors}
              selected={selectedColor}
              onSelect={setSelectedColor}
            />
          )}

          {product.sizes.length > 1 && (
            <p className="-mt-3 text-sm text-muted">
              Stock is tracked per product, not per size. Check your size with the shop before you buy.
            </p>
          )}

          {product.description && <p className="max-w-prose whitespace-pre-line leading-relaxed">{product.description}</p>}

          {/* Add to Cart Section */}
          {product.inStock && (
            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-ink">Quantity</span>
                <div className="flex items-center rounded-lg border border-line bg-surface-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="p-2 text-muted hover:text-ink disabled:opacity-40"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-semibold text-ink">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    disabled={quantity >= 10}
                    aria-label="Increase quantity"
                    className="p-2 text-muted hover:text-ink disabled:opacity-40"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleAddToCart(false)}
                  className="flex-1 justify-center py-3"
                >
                  <ShoppingBag size={18} className="mr-2" aria-hidden="true" />
                  {addedNotice ? 'Added to Cart ✓' : 'Add to Cart'}
                </Button>
                {addedNotice && (
                  <ButtonLink to="/cart" variant="secondary" className="justify-center">
                    View Cart
                  </ButtonLink>
                )}
              </div>

              {mismatch && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
                  <p className="font-semibold">Start a new order?</p>
                  <p className="mt-1">
                    Your cart contains items from <strong>{mismatch.currentShop}</strong>. Each online order is placed from a single shop.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(true)}
                      className="rounded bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      Clear Cart & Add Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setMismatch(null)}
                      className="rounded border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    >
                      Keep Current Cart
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <section aria-labelledby="buy-heading" className="rounded-xl border border-line bg-surface-2 p-5">
            <h2 id="buy-heading" className="text-lg font-semibold">
              Buy from {shop.name}
            </h2>
            <p className="mt-1 text-sm text-muted">Contact the shop to buy this item or inquire about variants.</p>
            <div className="mt-3 flex flex-col gap-2">
              {where && (
                <span className="flex items-center gap-2">
                  <MapPin size={16} aria-hidden="true" className="shrink-0 text-muted" />
                  {where}
                </span>
              )}
              {shop.phone && (
                <a
                  href={`tel:${shop.phone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-2 font-semibold text-brand hover:underline"
                >
                  <Phone size={16} aria-hidden="true" className="shrink-0" />
                  {shop.phone}
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
