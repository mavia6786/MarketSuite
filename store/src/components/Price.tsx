import { formatPKR } from '@/utils/format';
import { cn } from '@/utils/cn';

/** Current price, plus the struck-through original price and a "% off" label when there is a real discount (display only). */
export function Price({ price, originalPrice, large = false }: { price: number; originalPrice: number | null; large?: boolean }) {
  const discounted = originalPrice !== null && originalPrice > price;
  const percentOff = discounted ? Math.round((1 - price / originalPrice) * 100) : 0;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={cn('font-bold', large ? 'text-3xl' : 'text-lg')}>{formatPKR(price)}</span>
      {discounted && (
        <>
          <span className="text-sm text-muted">
            <span className="sr-only">Was </span>
            <s>{formatPKR(originalPrice)}</s>
          </span>
          {percentOff > 0 && <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-ink">{percentOff}% off</span>}
        </>
      )}
    </p>
  );
}
