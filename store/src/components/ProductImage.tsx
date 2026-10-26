import { useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * Product photo with a quiet fallback tile (the product's first letter) when there is no photo or it fails to load.
 * Photos come from owner-entered http(s) links, so they are lazy-loaded and sent without a referrer.
 */
export function ProductImage({ src, name, className, eager = false }: { src: string; name: string; className?: string; eager?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== '' && failedSrc !== src;
  return (
    <div className={cn('relative aspect-square overflow-hidden bg-brand-soft', className)}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div role="img" aria-label={`No photo for ${name}`} className="flex h-full w-full items-center justify-center font-display text-5xl font-bold text-brand">
          {name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}
    </div>
  );
}
