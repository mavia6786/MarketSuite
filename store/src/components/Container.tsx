import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)} {...rest} />;
}
