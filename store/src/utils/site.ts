/** Public site configuration. Values here are visible to everyone — never put secrets in them. */
export const siteConfig = {
  name: 'MarketSuite Store',
  portalUrl: (import.meta.env.VITE_PORTAL_URL as string | undefined) || '',
} as const;
