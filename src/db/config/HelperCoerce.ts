import { z } from 'zod';

/**
 * Helper to coerce string to number for FormData
 * Accepts both string and number inputs
 * Returns undefined for empty/null values
 */
export const coerceNumber = z.preprocess((val) => {
  // Handle null, undefined, or empty string
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') {
    return undefined;
  }
  
  // If already a number, return it
  if (typeof val === 'number') {
    return val;
  }
  
  // Try to parse string to number
  if (typeof val === 'string') {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }
  
  return undefined;
}, z.number().optional());