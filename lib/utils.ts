import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function periodRange(period: string, startDate: number = 1) {
  const [y, m] = period.split("-").map(Number);
  // Use Date.UTC to avoid timezone issues
  const start = new Date(Date.UTC(y, m - 1, startDate)).toISOString().split('T')[0];
  const end = new Date(Date.UTC(y, m, startDate - 1)).toISOString().split('T')[0];

  return { start, end };
}
