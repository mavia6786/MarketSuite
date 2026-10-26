import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/Button';
import { ApiErrorNotice, StateNotice } from '@/components/StateNotice';
import { useRemote } from '@/hooks/useRemote';
import { usePageMeta } from '@/hooks/usePageMeta';
import { ProductBrowser } from '@/components/ProductBrowser';
import { getShop } from '@/services/publicApi';

export default function ShopPage() {
  const { slug = '' } = useParams();
  const loader = useCallback((signal: AbortSignal) => getShop(slug, signal), [slug]);
  const { state, retry } = useRemote(loader);
  usePageMeta(
    state.status === 'ok' ? state.data.name : 'Shop',
    state.status === 'ok' ? `Browse products from ${state.data.name}${state.data.city ? ` in ${state.data.city}` : ''}.` : undefined,
  );

  if (state.status === 'loading') {
    return (
      <Container className="py-10">
        <div aria-busy="true" aria-label="Loading shop" className="st-skeleton h-40 rounded-xl" />
      </Container>
    );
  }
  if (state.status === 'error') {
    return (
      <Container className="py-10">
        {state.error.status === 404 && state.error.code !== 'NOT_FOUND' ? (
          <StateNotice title="Shop not found" action={<ButtonLink to="/shops" variant="secondary">Browse all shops</ButtonLink>}>
            This shop doesn’t exist, or its online store is switched off.
          </StateNotice>
        ) : (
          <ApiErrorNotice error={state.error} onRetry={retry} />
        )}
      </Container>
    );
  }

  const shop = state.data;
  return (
    <Container className="py-10">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="st-awning" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <p className="text-sm font-medium text-brand">{shop.type === 'Shoes' ? 'Shoe shop' : 'Clothing shop'}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{shop.name}</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted">
            {shop.city && (
              <span className="flex items-center gap-1.5">
                <MapPin size={16} aria-hidden="true" />
                {[shop.address, shop.city].filter(Boolean).join(', ')}
              </span>
            )}
            {shop.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={16} aria-hidden="true" />
                {shop.phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <ProductBrowser slug={shop.slug} />
    </Container>
  );
}
