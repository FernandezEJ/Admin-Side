import { EmptyState } from '../ui/PageState';
import MonthFilter from '../ui/MonthFilter';
import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { analyticsYears, getRewardsAnalyticsForPeriod } from '../../data/rewardsAnalytics';
import { monthOptions } from '../../data/monthOptions';

export default function RewardsAnalytics({ inventory }) {
  const [year, setYear] = useState(analyticsYears[0]);
  const [month, setMonth] = useState('');
  const { summary, monthly_redemptions, top_rewards } = getRewardsAnalyticsForPeriod(inventory, year, month);
  const chartData = monthly_redemptions.map((row) => ({
    label: monthOptions.find((option) => option.value === row.period.slice(5, 7)).label,
    redemptions: row.redemptions,
  }));
  return (
    <section aria-label="Rewards Analytics" className="space-y-6 p-4 lg:p-6">
      <h3 className="text-lg font-bold text-gray-800">Rewards Analytics</h3>
      <dl aria-live="polite" className="grid gap-4 sm:grid-cols-3">
        {[
          ['Redeemed', summary.total_redemptions],
          ['Points Spent', summary.total_points_spent],
          ['Active Stock', summary.active_inventory],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-4">
          <dt className="text-sm text-gray-500">{label}</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString('en-US')}</dd>
        </div>)}
      </dl>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-gray-600">Year
          <select value={year} onChange={(event) => setYear(event.target.value)} className="mt-2 block h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-normal text-gray-600 outline-none focus:border-[#b7192e]">
            {analyticsYears.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <MonthFilter value={month} onChange={setMonth} />
      </div>
      <article className="min-w-0 bg-white p-6">
        <h4 className="font-bold text-gray-800">Redemption Trend</h4>
        {!summary.total_redemptions ? <EmptyState title="No redemptions for this period" /> : <>
          <div className="mt-7 h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#eeeeee"
                    />

                    <XAxis
                      dataKey="label"
                      tickFormatter={(label) => label.slice(0, 3)}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#9ca3af',
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{
                        fill: '#9ca3af',
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: '#fff5f6',
                      }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #eeeeee',
                        fontSize: '12px',
                      }}
                    />

                    <Bar
                      dataKey="redemptions"
                      name="Redeemed"
                      fill="#b7192e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only">{chartData.map((row) => <li key={row.label}>{row.label}: {row.redemptions} redemptions</li>)}</ul>
        </>}
      </article>
      <article className="bg-white p-4 sm:p-6">
        <h4 className="font-bold text-gray-800">Top 3 Most Redeemed Rewards</h4>
        {!top_rewards.length ? <p className="mt-4 text-sm text-gray-500">No rewards redeemed for this period.</p> :
          <ol className="mt-4 divide-y divide-gray-100">
            {top_rewards.slice(0, 3).map((reward, index) => <li key={reward.reward_id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-semibold text-gray-700">{index + 1}. {reward.reward_name}</span>
              <span className="text-gray-500">{reward.redemptions} redemptions</span>
            </li>)}
          </ol>}
      </article>
    </section>
  );
}
