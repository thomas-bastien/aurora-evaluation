import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats evaluation scores consistently across the platform
 * - Integer scores (8.0, 7.0, 10.0) display as "8", "7", "10"
 * - Fractional scores (8.25, 7.678) display with 2 decimal places: "8.25", "7.68"
 * - Handles null/undefined scores with fallback
 */
export function formatScore(score: number | null | undefined, fallback: string = 'N/A'): string {
  if (score === null || score === undefined || isNaN(score)) {
    return fallback;
  }
  
  // Check if the score is effectively an integer (no significant fractional part)
  if (score % 1 === 0) {
    return Math.round(score).toString();
  }
  
  // For fractional values, use 2 decimal places
  return score.toFixed(2);
}
