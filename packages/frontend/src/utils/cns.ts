import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and merges Tailwind CSS classes using tailwind-merge.
 * This utility resolves conflicts between Tailwind classes (e.g., 'px-2 px-4' becomes 'px-4').
 *
 * @param inputs - Class values (strings, arrays, objects with boolean conditions)
 * @returns Merged class name string
 *
 * @example
 * cns('px-2 py-1', 'bg-blue-500') // => 'px-2 py-1 bg-blue-500'
 * cns('px-2', 'px-4') // => 'px-4' (tailwind-merge resolves conflict)
 * cns('base-class', isActive && 'active-class') // => 'base-class active-class' (if isActive is true)
 */
export function cns(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
