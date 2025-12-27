import { v4 } from 'uuid';

/**
 * Returns a unique UUID with option context string attached
 */
export function generateId(context?: string): string {
  const id = v4();
  return context ? `${context}-${id}` : id;
}
