import { matchesMonth } from './monthOptions';
export const mockRedemptions = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      reward: '₱500 Grocery Voucher',
      pointsUsed: 350,
      redeemedDate: '2026-09-16',
      status: 'inactive',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      reward: '₱300 Grocery Voucher',
      pointsUsed: 250,
      redeemedDate: '2026-09-15',
      status: 'active',
    },
    {
      id: 3,
      donor: 'Carlo Reyes',
      reward: '₱200 Grocery Voucher',
      pointsUsed: 150,
      redeemedDate: '2026-08-12',
      status: 'expired',
    },
  ];


export function filterRedemptions(records, status = '', month = '') {
  return records.filter((row) => (!status || row.status === status) && matchesMonth(row.redeemedDate.slice(0, 7), month));
}
