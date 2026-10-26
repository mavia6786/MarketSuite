import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button, ButtonLink } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { ProductCard, ProductSkeletons } from '@/components/ProductCard';
import { ApiErrorNotice, StateNotice } from '@/components/StateNotice';
import { useRemote } from '@/hooks/useRemote';
import { getShopCategories, getShopProducts } from '@/services/publicApi';
import { cn } from '@/utils/cn';

const SEARCH_DELAY_MS = 350;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}

/**
 * Products of one shop with search, category filter and pages. All state lives in the URL
 * (?q=…&category=…&page=…), so results can be shared, bookmarked and reached with the back button.
 */
export function ProductBrowser({ slug }: { slug: string }) {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim().slice(0, 80);
  const category = (params.get('category') ?? '').trim().slice(0, 50);
  const page = parsePage(params.get('page'));

  const update = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setParams(next, { replace });
    },
    [params, setParams],
  );

  // --- search box: typing updates the URL after a short pause ---
  const [text, setText] = useState(q);
  const committed = useRef(q);
  useEffect(() => {
    if (q !== committed.current) {
      committed.current = q; // URL changed from outside (back button, clear filters)
      setText(q);
    }
  }, [q]);
  useEffect(() => {
    const next = text.trim().slice(0, 80);
    if (next === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = next;
      update({ q: next || null, page: null }, true);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, update]);

  // --- data ---
  const productsLoader = useCallback((signal: AbortSignal) => getShopProducts(slug, { q: q || undefined, category: category || undefined, page: page > 1 ? page : undefined }, signal), [slug, q, category, page]);
  const { state, retry } = useRemote(productsLoader);
  const categoriesLoader = useCallback((signal: AbortSignal) => getShopCategories(slug, signal), [slug]);
  const { state: catState } = useRemote(categoriesLoader); // a failure here only hides the chips
  const categories = catState.status === 'ok' && Array.isArray(catState.data) ? catState.data : [];

  // bring the results into view when the page number changes (never on first load; safe under StrictMode's double effects)
  const top = useRef<HTMLDivElement>(null);
  const shownPage = useRef(page);
  useEffect(() => {
    if (shownPage.current === page) return;
    shownPage.current = page;
    top.current?.scrollIntoView?.({ block: 'start' });
  }, [page]);

  const filtering = q !== '' || category !== '';
  const clear = () => {
    setText('');
    committed.current = '';
    setParams(new URLSearchParams(), { replace: false });
  };

  return (
    <section aria-labelledby="products-heading" className="mt-10">
      <h2 id="products-heading" className="text-2xl font-bold">
        Products
      </h2>

      <div ref={top} className="mt-4 scroll-mt-20">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative max-w-md">
          <label htmlFor="product-search" className="sr-only">
            Search this shop’s products
          </label>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="product-search"
            type="search"
            value={text}
            maxLength={80}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by name, brand or category"
            className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-base placeholder:text-muted focus:border-brand"
          />
        </form>

        {categories.length > 0 && (
          <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
            {['', ...categories].map((c) => {
              const active = category.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ category: c || null, page: null })}
                  className={cn(
                    'h-10 rounded-full border px-4 text-sm font-semibold transition-colors',
                    active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2',
                  )}
                >
                  {c || 'All'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6">
        {state.status === 'loading' && <ProductSkeletons />}
        {state.status === 'error' && <ApiErrorNotice error={state.error} onRetry={retry} />}
        {state.status === 'ok' && state.data.items.length === 0 && (
          page > 1 && state.data.total > 0 ? (
            <StateNotice title="That page doesn’t exist" action={<Button variant="secondary" onClick={() => update({ page: null })}>Go to the first page</Button>}>
              There are fewer results than that. Go back to the first page.
            </StateNotice>
          ) : filtering ? (
            <StateNotice title="No products match" action={<Button variant="secondary" onClick={clear}>Clear search and filters</Button>}>
              Try a different word or category.
            </StateNotice>
          ) : (
            <StateNotice title="No products yet" action={<ButtonLink to="/shops" variant="secondary">Browse other shops</ButtonLink>}>
              This shop hasn’t put any products online yet.
            </StateNotice>
          )
        )}
        {state.status === 'ok' && state.data.items.length > 0 && (
          <>
            <p role="status" className="mb-4 text-sm text-muted">
              {state.data.total === 1 ? '1 product' : `${state.data.total} products`}
              {filtering ? ' found' : ''}
            </p>
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {state.data.items.map((product) => (
                <li key={product.id}>
                  <ProductCard shopSlug={slug} product={product} />
                </li>
              ))}
            </ul>
            <Pagination page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onChange={(p) => update({ page: p > 1 ? String(p) : null })} />
          </>
        )}
      </div>
    </section>
  );
}
