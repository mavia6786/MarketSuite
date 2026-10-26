import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '@/components/Container';
import { ShopCard } from '@/components/ShopCard';
import { ApiErrorNotice, CardSkeletons, StateNotice } from '@/components/StateNotice';
import { ButtonLink } from '@/components/Button';
import { useRemote } from '@/hooks/useRemote';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getShops } from '@/services/publicApi';
import type { ShopType } from '@/types';
import { cn } from '@/utils/cn';

const FILTERS: { label: string; value: ShopType | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Shoes', value: 'Shoes' },
  { label: 'Clothes', value: 'Clothes' },
];

export default function ShopsPage() {
  usePageMeta('Shops', 'Browse shoe and clothing shops on MarketSuite Store.');
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim().slice(0, 80) ?? '';
  const rawType = params.get('type');
  const type: ShopType | undefined = rawType === 'Shoes' || rawType === 'Clothes' ? rawType : undefined;

  const loader = useCallback((signal: AbortSignal) => getShops({ q: q || undefined, type }, signal), [q, type]);
  const { state, retry } = useRemote(loader);

  function setType(value: ShopType | '') {
    const next = new URLSearchParams(params);
    if (value) next.set('type', value);
    else next.delete('type');
    setParams(next);
  }

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">{q ? `Shops matching “${q}”` : 'All shops'}</h1>

      <div role="group" aria-label="Filter by shop type" className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (type ?? '') === f.value;
          return (
            <button
              key={f.label}
              type="button"
              aria-pressed={active}
              onClick={() => setType(f.value)}
              className={cn(
                'h-10 rounded-full border px-4 text-sm font-semibold transition-colors',
                active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {state.status === 'loading' && <CardSkeletons />}
        {state.status === 'error' && <ApiErrorNotice error={state.error} onRetry={retry} />}
        {state.status === 'ok' && state.data.items.length === 0 && (
          <StateNotice
            title="No shops found"
            action={q || type ? <ButtonLink to="/shops" variant="secondary">Clear filters</ButtonLink> : undefined}
          >
            {q || type ? 'Try a different name, city or shop type.' : 'Shops appear here once their owners switch on their online store.'}
          </StateNotice>
        )}
        {state.status === 'ok' && state.data.items.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.items.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
