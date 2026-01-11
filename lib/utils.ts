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

export function currentPeriod(startDate: number = 1) {
  // Use UTC to avoid timezone issues
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [y, m, d] = utcDate.toISOString().split("T")[0].split("-").map(Number);
  
  if (d < startDate) {
    const prevMonth = m - 1 === 0 ? 12 : m - 1;
    const prevYear = prevMonth === 12 ? y - 1 : y;

    return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  } else {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
}

export function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  // Use Date.UTC to avoid timezone issues
  const d = new Date(Date.UTC(y, m - 2, 1));

  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
