import { clsx, type ClassValue } from 'clsx';

/** Conditional class-name helper. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
