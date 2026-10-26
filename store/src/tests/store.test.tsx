import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { apiRequest, ApiError } from '@/services/api';
import { getProduct, getShopProducts } from '@/services/publicApi';
import { formatPKR } from '@/utils/format';

type Handler = (url: string) => { status: number; body: unknown } | 'network-error';

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const result = handler(String(input));
    if (result === 'network-error') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const ok = (body: unknown) => ({ status: 200, body });
const health = ok({ status: 'ok' });
const notFoundRoute = { status: 404, body: { message: 'Not found.', code: 'NOT_FOUND' } };

const shop = { id: '1', slug: 'stepup', name: 'StepUp Shoes', type: 'Shoes', city: 'Rawalpindi', address: 'Saddar', phone: '0300 123-4567' };
const emptyProducts = { items: [], total: 0, page: 1, pageSize: 24 };
const product = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `p${n}`, name: `Runner ${n}`, brand: 'Nike', category: 'Men', subCategory: 'Running', price: 5000, originalPrice: null,
  sizes: ['41', '42'], colors: ['Black'], imageUrl: '', description: `About runner ${n}.`, inStock: true, ...extra,
});
const list = (items: unknown[], total = items.length, page = 1) => ({ items, total, page, pageSize: 24 });
/** Backend double for one shop: `products(url)` decides the product-list answer. */
function shopApi(products: (url: string) => unknown, categories: string[] = ['Men', 'Women'], single?: (id: string) => ReturnType<Handler>) {
  return mockFetch((url) => {
    if (url.endsWith('/health')) return health;
    if (url.includes('/categories')) return ok({ data: categories });
    const one = /\/products\/([^/?]+)$/.exec(url);
    if (one) return single ? single(one[1] as string) : ok({ data: product(1) });
    if (url.includes('/products')) return ok({ data: products(url) });
    return ok({ data: shop });
  });
}
const calls = (fn: ReturnType<typeof mockFetch>) => fn.mock.calls.map((c) => String(c[0]));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => mockFetch((url) => (url.endsWith('/health') ? health : notFoundRoute)));
afterEach(() => vi.unstubAllGlobals());

describe('home page', () => {
  it('shows the headline, search and shop-type links', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/shoes and clothes/i);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Shoes/ })).toHaveAttribute('href', '/shops?type=Shoes');
    expect(screen.getByRole('link', { name: /^Clothes/ })).toHaveAttribute('href', '/shops?type=Clothes');
    await screen.findByText('Service online');
  });

  it('searching goes to the shops page with the term', async () => {
    mockFetch((url) => (url.endsWith('/health') ? health : ok({ data: { items: [], total: 0, page: 1, pageSize: 20 } })));
    renderAt('/');
    await userEvent.type(screen.getByLabelText(/search shops/i), 'rawal');
    await userEvent.click(screen.getByRole('button', { name: 'Find shops' }));
    expect(await screen.findByRole('heading', { level: 1, name: /matching “rawal”/i })).toBeInTheDocument();
  });

  it('lists shops that are online', async () => {
    mockFetch((url) =>
      url.endsWith('/health') ? health : ok({ data: { items: [shop], total: 1, page: 1, pageSize: 20 } }),
    );
    renderAt('/');
    const link = await screen.findByRole('link', { name: /StepUp Shoes/ });
    expect(link).toHaveAttribute('href', '/shop/stepup');
  });
});

describe('shops page', () => {
  it('shows an empty state with a way to clear filters', async () => {
    mockFetch((url) => (url.endsWith('/health') ? health : ok({ data: { items: [], total: 0, page: 1, pageSize: 20 } })));
    renderAt('/shops?type=Shoes');
    expect(await screen.findByText('No shops found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shoes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sends the search and type filter to the API', async () => {
    const fn = mockFetch((url) => (url.endsWith('/health') ? health : ok({ data: { items: [], total: 0, page: 1, pageSize: 20 } })));
    renderAt('/shops?q=ali&type=Clothes');
    await screen.findByText('No shops found');
    const urls = fn.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain('/api/public/shops?q=ali&type=Clothes');
  });

  it('ignores an unknown type value in the URL', async () => {
    const fn = mockFetch((url) => (url.endsWith('/health') ? health : ok({ data: { items: [], total: 0, page: 1, pageSize: 20 } })));
    renderAt('/shops?type=<script>');
    await screen.findByText('No shops found');
    expect(fn.mock.calls.map((c) => String(c[0]))).toContain('/api/public/shops');
  });

  it('explains when the backend has no public endpoints yet', async () => {
    renderAt('/shops');
    expect(await screen.findByText(/store service isn’t connected yet/i)).toBeInTheDocument();
  });

  it('shows a retryable error when the server is unreachable', async () => {
    let fail = true;
    mockFetch((url) => {
      if (url.endsWith('/health')) return health;
      return fail ? 'network-error' : ok({ data: { items: [shop], total: 1, page: 1, pageSize: 20 } });
    });
    renderAt('/shops');
    expect(await screen.findByText('Can’t reach the server')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /StepUp Shoes/ })).toBeInTheDocument();
  });
});

describe('shop page', () => {
  it('shows the shop details', async () => {
    mockFetch((url) => (url.endsWith('/health') ? health : url.includes('/products') ? ok({ data: emptyProducts }) : url.includes('/categories') ? ok({ data: [] }) : ok({ data: shop })));
    renderAt('/shop/stepup');
    expect(await screen.findByRole('heading', { level: 1, name: 'StepUp Shoes' })).toBeInTheDocument();
    expect(screen.getByText('Saddar, Rawalpindi')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('StepUp Shoes — MarketSuite Store'));
  });

  it('shows "Shop not found" when the shop does not exist', async () => {
    mockFetch((url) =>
      url.endsWith('/health') ? health : { status: 404, body: { message: 'Shop not found.', code: 'SHOP_NOT_FOUND' } },
    );
    renderAt('/shop/nope');
    expect(await screen.findByText('Shop not found')).toBeInTheDocument();
  });
});

describe('shop products', () => {
  it('lists the shop’s products with price, discount and out-of-stock state', async () => {
    shopApi(() => list([product(1, { price: 4000, originalPrice: 5000 }), product(2, { inStock: false })]));
    renderAt('/shop/stepup');
    expect(await screen.findByRole('heading', { level: 3, name: 'Runner 1' })).toBeInTheDocument();
    expect(screen.getByText('Rs 4,000')).toBeInTheDocument();
    expect(screen.getByText('20% off')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('2 products')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Runner 1/ })).toHaveAttribute('href', '/shop/stepup/product/p1');
  });

  it('loads the first page without filters', async () => {
    const fn = shopApi(() => list([product(1)]));
    renderAt('/shop/stepup');
    await screen.findByText('Runner 1');
    expect(calls(fn)).toContain('/api/public/shops/stepup/products');
    expect(calls(fn)).toContain('/api/public/shops/stepup/categories');
  });

  it('typing in the search box searches this shop (after a short pause) and resets to page 1', async () => {
    const fn = shopApi(() => list([product(1)]));
    renderAt('/shop/stepup?page=3');
    await screen.findByText('Runner 1');
    await userEvent.type(screen.getByRole('searchbox', { name: /search this shop/i }), 'red');
    await waitFor(() => expect(calls(fn)).toContain('/api/public/shops/stepup/products?q=red'));
    expect(calls(fn).filter((u) => u.includes('q=r&') || u.endsWith('q=r') || u.endsWith('q=re'))).toHaveLength(0); // one request per pause, not per key
  });

  it('category chips filter, are marked pressed, and "All" clears them', async () => {
    const fn = shopApi(() => list([product(1)]));
    renderAt('/shop/stepup');
    await screen.findByText('Runner 1');
    const women = await screen.findByRole('button', { name: 'Women' });
    await userEvent.click(women);
    await waitFor(() => expect(calls(fn)).toContain('/api/public/shops/stepup/products?category=Women'));
    expect(screen.getByRole('button', { name: 'Women' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('paginates with Previous / Next', async () => {
    const fn = shopApi((url) => (url.includes('page=2') ? list([product(25)], 50, 2) : list([product(1)], 50, 1)));
    renderAt('/shop/stepup');
    await screen.findByText('Runner 1');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Runner 25')).toBeInTheDocument();
    expect(calls(fn)).toContain('/api/public/shops/stepup/products?page=2');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('does not scroll on first load, and scrolls to the results once when the page changes', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    shopApi((url) => (url.includes('page=2') ? list([product(25)], 50, 2) : list([product(1)], 50, 1)));
    renderAt('/shop/stepup');
    await screen.findByText('Runner 1');
    expect(scroll).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Runner 25');
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('hides pagination when everything fits on one page', async () => {
    shopApi(() => list([product(1)]));
    renderAt('/shop/stepup');
    await screen.findByText('Runner 1');
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('says so when a search matches nothing, and clearing brings the products back', async () => {
    shopApi((url) => (url.includes('q=zzz') ? list([]) : list([product(1)])));
    renderAt('/shop/stepup?q=zzz');
    expect(await screen.findByText('No products match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(await screen.findByText('Runner 1')).toBeInTheDocument();
  });

  it('says so when the shop has no products online', async () => {
    shopApi(() => list([]), []);
    renderAt('/shop/stepup');
    expect(await screen.findByText('No products yet')).toBeInTheDocument();
  });

  it('handles a page number past the end', async () => {
    shopApi((url) => (url.includes('page=9') ? list([], 5, 9) : list([product(1)], 5)));
    renderAt('/shop/stepup?page=9');
    expect(await screen.findByText('That page doesn’t exist')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to the first page' }));
    expect(await screen.findByText('Runner 1')).toBeInTheDocument();
  });

  it('shows an error with a working "Try again" when products fail to load', async () => {
    let fail = true;
    // first answer: server error for the product list only
    mockFetch((url) => {
      if (url.endsWith('/health')) return health;
      if (url.includes('/categories')) return ok({ data: [] });
      if (url.includes('/products')) {
        if (fail) return { status: 500, body: { message: 'Server error.', code: 'SERVER_ERROR' } };
        return ok({ data: list([product(1)]) });
      }
      return ok({ data: shop });
    });
    renderAt('/shop/stepup');
    const retry = await screen.findByRole('button', { name: 'Try again' });
    fail = false;
    await userEvent.click(retry);
    expect(await screen.findByText('Runner 1')).toBeInTheDocument();
  });

  it('a failing category request only hides the chips', async () => {
    mockFetch((url) => {
      if (url.endsWith('/health')) return health;
      if (url.includes('/categories')) return { status: 500, body: { message: 'x', code: 'SERVER_ERROR' } };
      if (url.includes('/products')) return ok({ data: list([product(1)]) });
      return ok({ data: shop });
    });
    renderAt('/shop/stepup');
    expect(await screen.findByText('Runner 1')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /category/i })).not.toBeInTheDocument();
  });

  it('shows a letter tile when a product has no photo or its photo fails to load', async () => {
    shopApi(() => list([product(1, { imageUrl: 'https://img.example/a.jpg' }), product(2)]));
    renderAt('/shop/stepup');
    const img = await screen.findByAltText('Runner 1');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.getByRole('img', { name: 'No photo for Runner 2' })).toBeInTheDocument();
    img.dispatchEvent(new Event('error'));
    expect(await screen.findByRole('img', { name: 'No photo for Runner 1' })).toBeInTheDocument();
  });
});

describe('product page', () => {
  it('shows details, sizes, colors, stock and how to buy', async () => {
    shopApi(() => list([]), [], () => ok({ data: product(1, { price: 4000, originalPrice: 5000, sizes: ['40', '41', '42'], colors: ['Black', 'White'], description: 'Light and fast.' }) }));
    renderAt('/shop/stepup/product/p1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Runner 1' })).toBeInTheDocument();
    expect(screen.getByText('Rs 4,000')).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sizes' })).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Colors' })).toBeInTheDocument();
    expect(screen.getByText(/not per size/i)).toBeInTheDocument();
    expect(screen.getByText('Light and fast.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buy from StepUp Shoes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /0300 123-4567/ })).toHaveAttribute('href', 'tel:03001234567');
    expect(screen.getByRole('link', { name: /StepUp Shoes/ })).toHaveAttribute('href', '/shop/stepup');
    await waitFor(() => expect(document.title).toBe('Runner 1 — StepUp Shoes — MarketSuite Store'));
  });

  it('marks an out-of-stock product and omits empty sections', async () => {
    shopApi(() => list([]), [], () => ok({ data: product(1, { inStock: false, sizes: [], colors: [], description: '' }) }));
    renderAt('/shop/stepup/product/p1');
    expect(await screen.findByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sizes?$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /colors?$/i })).not.toBeInTheDocument();
  });

  it('opened from the shop page, "back" returns to the same search', async () => {
    shopApi(() => list([product(1)]));
    renderAt('/shop/stepup?q=run&page=2');
    await userEvent.click(await screen.findByRole('link', { name: /Runner 1/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Runner 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /StepUp Shoes/ })).toHaveAttribute('href', '/shop/stepup?q=run&page=2');
  });

  it('shows "This product isn’t available" for an unknown or unpublished product', async () => {
    shopApi(() => list([]), [], () => ({ status: 404, body: { message: 'Product not found.', code: 'PRODUCT_NOT_FOUND' } }));
    renderAt('/shop/stepup/product/zzz');
    expect(await screen.findByText('This product isn’t available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the shop’s products' })).toHaveAttribute('href', '/shop/stepup');
  });

  it('shows "Shop not found" when the shop is switched off', async () => {
    mockFetch((url) => (url.endsWith('/health') ? health : { status: 404, body: { message: 'Shop not found.', code: 'SHOP_NOT_FOUND' } }));
    renderAt('/shop/nope/product/p1');
    expect(await screen.findByText('Shop not found')).toBeInTheDocument();
  });
});

describe('other pages', () => {
  it('shows the empty cart', () => {
    renderAt('/cart');
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('shows the tracking placeholder', () => {
    renderAt('/orders/track');
    expect(screen.getByRole('heading', { level: 1, name: 'Track your order' })).toBeInTheDocument();
  });

  it('shows 404 for unknown routes', () => {
    renderAt('/does-not-exist');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('has a skip link and a labelled main navigation', () => {
    renderAt('/cart');
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});

describe('api client', () => {
  it('unwraps a { data } envelope and passes bare bodies through', async () => {
    mockFetch((url) => (url.endsWith('/a') ? ok({ data: { x: 1 } }) : ok({ status: 'ok' })));
    expect(await apiRequest('/a')).toEqual({ x: 1 });
    expect(await apiRequest('/b')).toEqual({ status: 'ok' });
  });

  it('turns { message, code } errors into ApiError', async () => {
    mockFetch(() => ({ status: 400, body: { message: 'Bad thing.', code: 'VALIDATION' } }));
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 400, code: 'VALIDATION', message: 'Bad thing.' });
    await expect(apiRequest('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('maps a network failure to status 0', async () => {
    mockFetch(() => 'network-error');
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('public products client', () => {
  const page = { items: [], total: 0, page: 2, pageSize: 24 };

  it('builds the products URL with encoded slug and query, and unwraps the paginated body', async () => {
    const fn = mockFetch(() => ok({ data: page }));
    expect(await getShopProducts('my-shop', { q: 'red shoe', category: 'Men', page: 2 })).toEqual(page);
    expect(fn.mock.calls.map((c) => String(c[0]))[0]).toBe('/api/public/shops/my-shop/products?q=red+shoe&category=Men&page=2');
  });

  it('omits empty query parts and fetches a single product by id', async () => {
    const fn = mockFetch(() => ok({ data: { id: 'p1' } }));
    await getShopProducts('my-shop');
    expect(await getProduct('my-shop', 'p1')).toEqual({ id: 'p1' });
    expect(fn.mock.calls.map((c) => String(c[0]))).toEqual(['/api/public/shops/my-shop/products', '/api/public/shops/my-shop/products/p1']);
  });
});

describe('formatPKR', () => {
  it('formats whole rupees and paisa', () => {
    expect(formatPKR(4999)).toBe('Rs 4,999');
    expect(formatPKR(1250.5)).toBe('Rs 1,250.50');
  });
});
