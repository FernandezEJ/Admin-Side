# LifeFlow Admin frontend

Frontend-only React/Vite preview. No Laravel, database, real authentication,
account provisioning, or network service integration is included.

## Run and check

- `npm run dev`: development server.
- `npm run build`: production build.
- `npm run lint`: full frontend lint.
- `npm run test:auth`: auth, navigation, Admin Management, Audit Logs,
  System Reports, Rewards Analytics, Dashboard role/data, and shared state checks.

## Mock session

`src/auth/AdminSessionProvider.jsx` owns the session. `roles.js` centralizes role
inheritance: Super Admin includes all Admin access. Login accepts any valid email
format and nonempty password without transmitting or saving credentials, then
creates the fixed Sample Admin identity. Remember me chooses localStorage;
otherwise sessionStorage is used. The key is `lifeflow.admin.mockSession`.
Logout clears both stores; malformed sessions start logged out.

To switch roles, set `VITE_MOCK_ADMIN_ROLE=admin` or
`VITE_MOCK_ADMIN_ROLE=super_admin` in `.env.local`, restart the development
server, then log out and in again. The override is development-only; production
mock login defaults to Admin. There is no visible role switcher or registration.
Frontend guards provide UX only; Laravel must enforce real authorization later.

## Pages and roles

All active page components live in `src/pages/`.

| Access | Routes |
| --- | --- |
| Public | `/` (Login) |
| Admin and Super Admin | `/dashboard`, `/announcements` and create/view/edit subroutes, `/verification` and detail subroute, `/donors`, `/rewards`, `/rewards/create` |
| Super Admin only | `/system-reports`, `/admin-management`, `/audit-logs` |

`RequireRole` redirects logged-out visitors to Login and unauthorized roles to
Dashboard. `/reports` is a guarded legacy redirect to `/system-reports`.
Feedback has no page or navigation entry. Unknown URLs redirect to Dashboard
(or Login when logged out). Navigation metadata lives in
`src/components/layout/navigation.js`.

## Organization and mock boundaries

- `src/pages/AdminManagement.jsx`: local create/edit, validated unique email,
  confirmed deactivate/reactivate, reset-password preview. Role is fixed to Admin.
  Edits reset on navigation/reload and do not create real accounts or send email.
- `src/pages/AuditLogs.jsx`: read-only mock history, combined search/module filters.
- `src/data/adminManagement.js`: account/audit fixtures and pure local transitions.
  Accounts use `id`, `name`, `email`, `role`, `status`, `created_at`; audit entries
  include actor, stable action key, label, module, target, details and ISO timestamp.
- `src/pages/SystemReports.jsx` and `src/styles/system-reports.css`: monthly report
  using existing charts and sample tables. Apply updates data and generated time
  together; other periods show no data. Print / Save as PDF opens browser printing.
  A4 rules hide app chrome and allow tables to paginate without clipping.
- `src/data/systemReports.js`: September/August 2026 and September 2025 datasets,
  with donor/donation summaries, blood types, weekly donations, rewards and notes.
- Rewards keeps management, redemption history and analytics in one module.
  `src/data/rewardsAnalytics.js` derives summary, monthly redemptions, value
  breakdown and top rewards from deterministic July–September 2026 records.
  Active stock reflects current management state; history is independent.
- `src/data/dashboardOverview.js`: derives Super Admin extras from existing
  account/audit/rewards fixtures. The shared operational Dashboard is preserved.
- `src/data/donors.js` and `verification.js`: stable extracted list fixtures.
- `src/components/ui/`: native modal dialog, empty/error/loading states, and an
  application render-error boundary. Mocks do not simulate network loading.

Future integration can replace these boundaries with `/api/admin/login`, `/me`,
`/logout`, `/admins`, `/audit-logs`, `/system-reports?month=YYYY-MM`,
`/rewards/analytics?month=YYYY-MM`, and `/dashboard` under the admin API prefix.
Existing prototype actions on older forms remain frontend placeholders; this
cleanup does not implement backend workflows.

## Responsive and verification notes

The shared Sidebar becomes an accessible icon rail below desktop width, retains
keyboard focus/title labels, and scrolls internally on short screens. Page
padding, header/profile spacing, filters, cards, tables and dialogs adapt to
narrower widths. Only the sidebar scrollbar is hidden; scrolling stays enabled
and table scrollbars remain visible. Report printing retains its A4 styles.

Unused Feedback and legacy login CSS were removed. Hook warnings are fixed by
extracting stable fixtures rather than suppressing dependencies. The existing
bundle-size advisory is retained; the route tree now lazy-loads with a reusable skeleton fallback. No heavy dependencies were added.

Automated checks cover rendered role visibility and state/data transitions, not
browser interactions or print pagination. Final visual QA at laptop/tablet/mobile
widths and browser print preview requires a connected browser. No backend work
should begin implicitly as part of this frontend pass.

## Adviser revisions

- Verification and similar warning/deleted statuses use text color without heavy
  filled badges. Donors and Top Donors have no View/profile navigation.
- Redemptions has combined Active/Inactive/Expired and month filters backed by
  `src/data/rewardRedemptions.js`. Analytics hides the management heading/cards
  and focuses on two charts and the ranked reward table.
- Admin Management separates Active and Deactivated Admins. Deactivated accounts
  offer only Reactivate within the recovery window; active accounts retain Edit,
  Deactivate, and Reset Password. Deactivation records `deactivated_at` and a
  30-day `scheduled_for_deletion_at`; reactivation clears these timestamps.
- `recoveryPolicy.js` shares 30-day date handling for Admins, Announcements, and
  Rewards. Expired recovery actions are blocked; records are never purged by
  frontend timers. History, completed donations, points, and audit records are
  unaffected. Permanent purge remains future backend work.
- Audit Logs adds a month input (Philippine time) combined with search/module.
- `ReportChart.jsx` keeps responsive screen charts and explicit 640x260 print
  charts. Print CSS switches to fixed charts and retains A4, colors and hidden
  navigation. Print / Save as PDF remains the sole browser-print action.
- `AppRoutes.jsx` preserves the route/guard tree. `App.jsx` lazy-loads it behind
  the reusable `PageSkeleton` and error boundary. This covers actual initial
  route-bundle loading for active pages with no artificial delay.

Build, lint, auth/navigation and focused filter/state/print-structure checks are
run after these revisions. Browser chart pagination, tab/filter interactions,
keyboard behavior and narrow-width layout still need manual visual QA when a
browser is available. The route bundle retains a size advisory. No API calls
or backend integration have been added.

## Filter/layout consistency revision

Rewards Analytics now uses three derived metrics (58 Redeemed, 16,800 Points
Spent, 32 Active Stock for the initial 2026 mock state) and one Most Redeemed
Rewards chart. Year options come from the mock records; All Months aggregates
only the selected year. Empty months display the existing empty state. Inventory
continues to reflect current active management stock.

`MonthFilter.jsx` and `monthOptions.js` provide All Months plus January–December
for Analytics, Redemptions, and Audit Logs. Raw period keys remain internal.
Redemptions retains combined status/month filtering. Audit Logs retains combined
search/module/month filtering, in that order. Month-only filters match the named
month across available years; the current history fixtures contain only 2026.
Admin Management now orders summary cards, search/create, status tabs, then table;
account actions and recovery policy are unchanged.
