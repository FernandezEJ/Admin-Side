import { monthOptions } from '../../data/monthOptions';

export default function MonthFilter({ value, onChange }) {
  return <label className="text-sm font-semibold text-gray-600">Month
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 block h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-normal text-gray-600 outline-none focus:border-primary">
      <option value="">All Months</option>
      {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
    </select>
  </label>;
}
