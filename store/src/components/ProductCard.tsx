import { Link, useLocation } from 'react-router-dom';
import type { PublicProduct } from '@/types';
import { ProductImage } from '@/components/ProductImage';
import { Price } from '@/components/Price';
import { cn } from '@/utils/cn';

export function ProductCard({ shopSlug, product }: { shopSlug: string; product: PublicProduct }) {
  const { search } = useLocation();
  return (
    <Link
      to={`/shop/${encodeURIComponent(shopSlug)}/product/${encodeURIComponent(product.id)}`}
      state={{ back: search }} // lets the product page return to the same search / page
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand"
    >
      <div className="relative">
        <ProductImage src={product.imageUrl} name={product.name} className={cn(!product.inStock && 'opacity-60')} />
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-md bg-ink px-2 py-1 text-xs font-semibold text-on-brand">Out of stock</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
        <h3 className="text-base font-semibold leading-snug group-hover:underline">{product.name}</h3>
        <div className="mt-auto pt-2">
          <Price price={product.price} originalPrice={product.originalPrice} />
        </div>
      </div>
    </Link>
  );
}

export function ProductSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading products" className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="st-skeleton aspect-[3/4] rounded-xl" />
      ))}
    </div>
  );
}
