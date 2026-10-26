import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { ShopCard } from '@/components/ShopCard';
import { ApiErrorNotice, CardSkeletons, StateNotice } from '@/components/StateNotice';
import { useRemote } from '@/hooks/useRemote';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getShops } from '@/services/publicApi';

const types = [
  { label: 'Shoes', to: '/shops?type=Shoes', note: 'Sneakers, formal, sandals and more' },
  { label: 'Clothes', to: '/shops?type=Clothes', note: 'Everyday wear, formal and kids' },
];

function LiveShops() {
  const loader = useCallback((signal: AbortSignal) => getShops({}, signal), []);
  const { state, retry } = useRemote(loader);

  if (state.status === 'loading') return <CardSkeletons count={3} />;
  if (state.status === 'error') return <ApiErrorNotice error={state.error} onRetry={retry} />;
  if (state.data.items.length === 0) {
    return (
      <StateNotice title="No shops are online yet">
        Shops appear here once their owners switch on their online store.
      </StateNotice>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {state.data.items.slice(0, 6).map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}

export default function HomePage() {
  usePageMeta('MarketSuite Store', 'Find shoe and clothing shops, browse their products and order online.');
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shops?q=${encodeURIComponent(term)}` : '/shops');
  }

  return (
    <>
      <section className="border-b border-line bg-brand-soft">
        <Container className="py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            Shoes and clothes, straight from the shop.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Pick a shop, choose what you like and order. Every item comes from the shop’s own stock.
          </p>
          <form onSubmit={onSubmit} role="search" className="mt-8 flex max-w-xl gap-2">
            <label htmlFor="shop-search" className="sr-only">
              Search shops by name or city
            </label>
            <div className="relative flex-1">
              <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="shop-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={80}
                placeholder="Shop name or city"
                className="h-12 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-base placeholder:text-muted"
              />
            </div>
            <Button type="submit" className="h-12">
              Find shops
            </Button>
          </form>
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="text-2xl font-semibold">What are you looking for?</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {types.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              className="rounded-xl border border-line bg-surface p-6 transition-colors hover:border-brand"
            >
              <span className="text-2xl font-bold font-display">{t.label}</span>
              <span className="mt-1 block text-muted">{t.note}</span>
            </Link>
          ))}
        </div>
      </Container>

      <Container className="pb-4">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Shops online</h2>
          <Link to="/shops" className="text-sm font-semibold text-brand underline">
            See all shops
          </Link>
        </div>
        <LiveShops />
      </Container>
    </>
  );
}
