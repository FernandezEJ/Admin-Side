# LifeFlow Admin frontend

React/Vite admin frontend with real Laravel bearer-token authentication.
Admin Management and Announcements also use Laravel. Dashboard and the other
operational modules still use mock data.

## Run and check

- `npm run dev`: development server.
- `npm run build`: production build.
- `npm run lint`: full frontend lint.
- `npm run test:auth`: auth, navigation, Admin Management, Audit Logs,
  System Reports, Rewards Analytics, Dashboard role/data, and shared state checks.

## Authentication setup

Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` in `.env.local` (see
`.env.example`), or use the same built-in local default. Restart Vite after changing
the URL. For a LAN backend, use that server's address instead. No credentials belong
in Vite environment variables.

`AdminSessionProvider` uses `/admin/login`, `/admin/me`, `/admin/logout`, and
`/admin/change-initial-password`. Remember me stores only the bearer token in
localStorage; unchecked uses sessionStorage. The key is `lifeflow.admin.token`.
Passwords and profiles are not persisted. Existing mock sessions are discarded;
`VITE_MOCK_ADMIN_ROLE` is ignored. Role and initial-password status come from Laravel.
Refresh restores through `/me` with a skeleton; invalid sessions clear, while network
errors offer retry. Logout clears local state even if its API request fails.

Users awaiting their first password change can access only the change page and
logout. Normal Admin and Super Admin retain their existing navigation permissions.
Laravel remains responsible for API authorization. Forgot password is unavailable.

### Manual auth check

1. Start Laravel at the configured API URL and run `npm run dev` here.
2. If no Super Admin exists, configure the backend's `SUPER_ADMIN_NAME`,
   `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD`, then run
   `php artisan db:seed --class=SuperAdminSeeder --no-interaction` in the backend.
3. Sign in with that account. If prompted, enter its current password and a new
   password (10+ characters, uppercase/lowercase, number and symbol).
4. Confirm Dashboard opens and Super Admin navigation appears. Refresh to check
   session restoration, then logout and log back in using the new password.
5. For an Admin already created via the backend/API, sign in with its temporary
   password. Confirm direct Dashboard navigation redirects to the password page.
   After changing it, confirm only Admin navigation appears and `/system-reports`,
   `/admin-management`, and `/audit-logs` redirect to Dashboard.
6. Log out, then visit `/dashboard`; it must return to Login.

## Admin Management setup and behavior

Super Admin uses `/admin/admins` to list/search accounts and create Admins with
Name + Email only. Edit updates name/email; confirmed actions deactivate,
reactivate, or request a reset email. Counts and tabs derive from real API data.
The generated temporary password appears only in the creation response modal,
supports clipboard copy, and clears on close/unmount without browser storage.

Deactivation revokes all tokens immediately. Recovery is available for 30 days;
reactivation requires a fresh login. `admins:purge-deactivated` runs daily at
midnight Asia/Manila through Laravel's scheduler. Accounts owning historical
records are retained for review instead of cascading deletion; audit logs survive.
There is no manual permanent-delete action.

The backend host must run `php artisan schedule:run` every minute and a worker
such as `php artisan queue:work database --queue=password-resets` for queued reset
emails, with its existing mail configuration. Reset reuses the existing code-email
infrastructure; this step adds no Admin forgot-password page. A successful request
does not confirm mail delivery. Tests fake mail and never send real reset emails.

## Pages and roles

### Announcements integration

Both Admin and Super Admin can list, create, edit, publish, move to Draft, delete,
and restore announcements. The existing donation opportunity is the single event
record: `donation_date` maps to `event_date`; no points field is submitted.
Search and month/year/status filters use real records. Save Draft hides the post;
Publish makes it available to donors. Expiration is the end of the selected day
in Asia/Manila, defaulting to the donation date if omitted. Restore returns to Draft.

Images accept JPEG/PNG up to 5 MB and use generated filenames on Laravel's public
disk. Run `php artisan storage:link` on each backend host and set its `APP_URL` to
an address reachable by the mobile device so returned image URLs can load.
The additive announcement migration and storage link are applied locally.

Mobile Home and announcement detail use `/api/announcements` and
`/api/announcements/{id}`. Join still uses `/api/donation-opportunities/{id}/join`;
the existing eligibility, duplicate-activity and pending Activity behavior remain.
The permanent Red Cross Dagupan option stays available, including when no post is
active. Posts may disappear from the board without losing joined activity history.

The Notify donors option uses existing important in-app notifications and push
jobs, deduplicated per donor/announcement. Run the existing default queue worker
(`php artisan queue:work`) for push delivery. Queue dispatch failures do not undo
publication; ordinary edits do not generate another notification.
`announcements:purge-deleted` runs daily at midnight Manila time through the
existing scheduler. It purges posts deleted for at least 30 days and their images
only when no participation exists. Posts with history are retained, along with
audit logs. No manual permanent-delete API is exposed.

Automated checks cover the real transports/state and backend lifecycle with fake
images/push. Manual acceptance on a physical device is still required: publish a
post with an image, view it on Home/detail, complete eligibility, confirm joining,
and see the pending Activity. Also verify image reachability and actual push delivery.

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

- `src/pages/AdminManagement.jsx`: real Super Admin-only account actions using
  `src/services/adminManagementApi.js` and `adminManagementState.js`, with shared
  bearer-token session handling, skeletons, retry and validation errors.
- `src/pages/AuditLogs.jsx`: read-only mock history, combined search/module filters.
- `src/data/adminManagement.js`: retained Dashboard/Audit Logs fixtures and pure local transitions.
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

Future module integration can replace the remaining mock boundaries with
`/audit-logs`, `/system-reports?month=YYYY-MM`,
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
  unaffected. Admin purge now runs on the backend; other module lifecycles remain mock.
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
browser is available. The route bundle retains a size advisory. Authentication,
Admin Management and Announcements are connected to the backend.

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
