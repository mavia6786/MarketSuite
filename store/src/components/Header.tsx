import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Container } from '@/components/Container';
import { cn } from '@/utils/cn';
import { useCart } from '@/context/CartContext';

const link = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-2', isActive ? 'text-brand' : 'text-ink');

export function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-baseline gap-1.5" aria-label="MarketSuite Store home">
          <span className="font-display text-xl font-bold tracking-tight">MarketSuite</span>
          <span className="rounded bg-sun px-1.5 py-0.5 text-xs font-bold">Store</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/shops" className={link}>
            Shops
          </NavLink>
          <NavLink to="/orders/track" className={link}>
            Track order
          </NavLink>
          <NavLink to="/cart" className={cn(link({ isActive: false }), 'relative inline-flex items-center')} aria-label="Cart">
            <ShoppingBag size={20} aria-hidden="true" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </NavLink>
        </nav>
      </Container>
    </header>
  );
}
