import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard utility to merge Tailwind classes safely with clsx and tailwind-merge.
 * Used for dynamic animations, micro-interactions, and conditional styling.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
