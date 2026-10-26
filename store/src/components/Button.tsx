import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

const base =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
};

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn(base, variants[variant], className)} {...rest} />;
}

export function ButtonLink({
  to,
  variant = 'primary',
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  );
}
