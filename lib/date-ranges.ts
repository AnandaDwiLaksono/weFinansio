export function thisWeekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Senin=0
  const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
  return { start, end };
}
export function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
  const end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
  return { start, end };
}
export function thisYearRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
  const end = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
  return { start, end };
}
