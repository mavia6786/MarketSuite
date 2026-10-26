import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { PublicShop } from '@/types';

export function ShopCard({ shop }: { shop: PublicShop }) {
  return (
    <Link
      to={`/shop/${encodeURIComponent(shop.slug)}`}
      className="group block overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand"
    >
      <div className="st-awning" aria-hidden="true" />
      <div className="p-5">
        <p className="text-sm font-medium text-brand">{shop.type === 'Shoes' ? 'Shoe shop' : 'Clothing shop'}</p>
        <h3 className="mt-1 text-xl font-semibold group-hover:underline">{shop.name}</h3>
        {shop.city && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={16} aria-hidden="true" />
            {shop.city}
          </p>
        )}
      </div>
    </Link>
  );
}
