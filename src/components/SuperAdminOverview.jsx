import { EmptyState } from './ui/PageState';
import { Link } from 'react-router-dom';
import { UserRoundCog, UserCheck, Gift, ArrowRight } from 'lucide-react';
import { formatDate } from '../data/adminManagement';

export default function SuperAdminOverview({ overview }) {
  const cards = [
    { label: 'Total Admins', value: overview.total_admins, description: 'Admin accounts', icon: UserRoundCog, to: '/admin-management' },
    { label: 'Active Admins', value: overview.active_admins, description: 'Active admin accounts', icon: UserCheck, to: '/admin-management' },
    { label: 'Rewards Redeemed', value: overview.rewards_summary.total_redemptions,
      description: overview.rewards_summary.period_label, icon: Gift },
  ];

  return (
    <section aria-labelledby="super-admin-overview" className="space-y-5">
      <div>
        <h2 id="super-admin-overview" className="text-lg font-bold text-gray-800">Super Admin Overview</h2>
        <p className="mt-1 text-sm text-gray-500">Current account totals and recent recorded activity.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, description, icon: Icon, to }) => {
          const Card = to ? Link : 'article';
          return <Card key={label} {...(to ? { to } : {})} className={`rounded-2xl border border-gray-200 bg-white p-6${to ? ' cursor-pointer transition hover:border-red-200 hover:bg-red-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e]' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <h3 className="text-sm font-semibold text-gray-500">{label}</h3>
              {to && <ArrowRight size={16} aria-hidden="true" className="ml-auto shrink-0 text-gray-400" />}
            </div>
            <p className="mt-6 text-3xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
            {label === 'Rewards Redeemed' && <p className="mt-3 text-sm text-gray-600">
              Most redeemed: {overview.rewards_summary.most_redeemed_reward ?? 'No redemptions'}
            </p>}
          </Card>;
        })}
      </div>
      <article className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-800">Recent Admin Activity</h3>
          <Link to="/audit-logs" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#b7192e] hover:bg-red-50">
            View Audit Logs <ArrowRight size={16} />
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {overview.recent_admin_activity.map((log) => (
            <li key={log.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <div><p className="font-semibold text-gray-800">{log.actor_name}</p>
                <p className="mt-1 text-gray-600">{log.action_label}</p>
              </div>
              <time dateTime={log.created_at} className="text-xs text-gray-500">{formatDate(log.created_at, true)} (PHT)</time>
            </li>
          ))}
        </ul>
        {!overview.recent_admin_activity.length && <EmptyState title="No recent admin activity" description="Activity will appear here when available." />}
      </article>
    </section>
  );
}
