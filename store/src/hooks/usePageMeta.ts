import { useEffect } from 'react';

/** Sets the document title and meta description for the current page (SEO + browser tab). */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title === 'MarketSuite Store' ? title : `${title} — MarketSuite Store`;
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }
  }, [title, description]);
}
