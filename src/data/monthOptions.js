export const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1))),
}));

export function matchesMonth(period, month) {
  return !month || (month.length === 7 ? period === month : period.slice(5, 7) === month);
}
