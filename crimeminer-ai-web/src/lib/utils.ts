import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names together, merging Tailwind CSS classes properly
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
} 