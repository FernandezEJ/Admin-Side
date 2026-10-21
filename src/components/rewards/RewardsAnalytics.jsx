import { EmptyState, ErrorState } from '../ui/PageState';
import { ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { monthOptions } from '../../data/monthOptions';

export default function RewardsAnalytics({ remote }) {
  const { year, analytics, analyticsLoading, analyticsError, model } = remote;
  if (!analytics) return null;
  const currentYear = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' }));
  const { summary, monthly_redemptions, top_rewards } = analytics;
  const chartData = monthly_redemptions.map((row) => ({
    label: monthOptions.find((option) => option.value === row.period.slice(5, 7)).label,
    redemptions: row.redemptions,
  }));
  return (
    <section aria-label="Rewards Analytics" aria-busy={analyticsLoading} className="space-y-6 p-4 lg:p-6">
      <h3 className="text-lg font-bold text-gray-800">Rewards Analytics</h3>
      {analyticsError && <ErrorState title="Unable to load Rewards Analytics" description={analyticsError} onRetry={() => model.loadAnalytics()} />}
      <dl aria-live="polite" className="grid gap-4 sm:grid-cols-3">
        {[
          ['Redeemed', summary.total_redemptions],
          ['Points Spent', summary.total_points_spent],
          ['Active Stock', summary.active_inventory],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <dt className="text-sm text-gray-500">{label}</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString('en-US')}</dd>
        </div>)}
      </dl>
      <article className="min-w-0 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-800">Redemption Trend</h4>
            <LoaderCircle size={16} aria-label="Refreshing analytics" aria-hidden={!analyticsLoading} className={analyticsLoading ? 'animate-spin text-gray-400' : 'text-gray-400 opacity-0'} />
          </div>
          <div role="group" aria-label="Analytics year" className="ml-auto flex h-11 shrink-0 items-center rounded-xl border border-gray-200 bg-white">
            <button type="button" aria-label="Previous year" disabled={Number(year) <= 2000} onClick={() => model.loadAnalytics(String(Number(year) - 1))} className="flex h-full w-11 items-center justify-center rounded-l-xl text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"><ChevronDown size={18} aria-hidden="true" /></button>
            <span className="w-16 text-center text-sm font-semibold tabular-nums text-gray-700">{year}</span>
            <button type="button" aria-label="Next year" disabled={Number(year) >= currentYear + 1} onClick={() => model.loadAnalytics(String(Number(year) + 1))} className="flex h-full w-11 items-center justify-center rounded-r-xl text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"><ChevronUp size={18} aria-hidden="true" /></button>
          </div>
        </div>
        {!summary.total_redemptions ? <EmptyState title="No redemptions for this year" /> : <>
          <div className="mt-7 h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-line)"
                    />

                    <XAxis
                      dataKey="label"
                      tickFormatter={(label) => label.slice(0, 3)}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: 'var(--color-neutral)',
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{
                        fill: 'var(--color-neutral)',
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: 'var(--color-selected)',
                      }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--color-line)',
                        fontSize: '12px',
                      }}
                    />

                    <Bar
                      dataKey="redemptions"
                      name="Redeemed"
                      fill="var(--color-primary)"
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
        {!top_rewards.length ? <p className="mt-4 text-sm text-gray-500">No rewards redeemed for this year.</p> :
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
