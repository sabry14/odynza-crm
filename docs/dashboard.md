# Dashboard

The CRM opens on Dashboard. Analytics remain inside Overview, Lead Trends,
Sources & Industries, and the admin-only Team Performance tab. There is no role
or view selector.

## Account access

`GET /api/dashboard` requires a valid JWT and an active database account.
Authentication reloads the current database role on every authenticated request,
so an old token or modified local storage cannot grant admin access.

- Admin: all leads, owner filters, and team comparisons.
- Sales and other non-privileged roles: only their assigned leads and activity.
- Catalog manager: preserves the application's existing organization-wide
  read-only visibility; no team comparison tab.
- Public signup always uses the default sales role, ignoring supplied role IDs.

No database migration or sample-data seed is required. The dashboard does not
write to the database. If an older activity table is absent or incompatible,
lead analytics remain available and the UI explains that history is unavailable.

## Metric definitions

| Metric | Definition |
| --- | --- |
| Active leads | All stages except Won and Lost (including Closed Won/Lost aliases) |
| Open opportunity value | Sum of active leads' estimated `deal_value`, in existing USD units |
| Qualified opportunities | Qualified, Proposal and Negotiation leads |
| Closed win rate | Won / (Won + Lost); no closed leads displays an em dash |
| Creation trend | `created_at`, UTC Monday weeks or UTC calendar months; 8 weeks / 12 months |
| Sources / industries | All filtered leads; blanks grouped as Not recorded |
| Needs attention | Open new leads at least 14 days old; no recorded update for at least 7 days; or missing value in Qualified/Proposal/Negotiation |
| Last recorded update | Latest of lead creation, `updated_at`, and recorded activity timestamp |
| Top opportunities | Five highest-value open leads |
| Recent activity | Latest 50 accessible events, filtered to matching leads; first 6 displayed |

Attention counts are distinct leads, not the number of reasons. Alerts describe
recorded CRM updates, not phone/email contact that is not logged. Current status
is not a historical funnel. No close dates, revenue history, conversion velocity,
or sample growth percentages are invented.

Owner/source/industry filters apply to metrics, charts, lists and exports. Chart
legends and bars open matching lead records, which link to Lead Details. Refresh
loads saved data again. The dashboard uses the application's persisted theme.
CSV exports neutralize spreadsheet-formula prefixes.

## Verification

```powershell
cd frontend
npm test
npm run build
cd ../backend
node --test test/*.test.js
node scripts/check-dashboard.js
```

The database check is read-only and prints counts and roles, not credentials.
For a running API, set `DASHBOARD_CHECK_URL` (default `http://localhost:5001/api`)
and run `node scripts/check-dashboard-api.js`. It verifies actual database-role
scoping with short-lived local tokens, including a deliberately stale admin claim.
Restart the backend after updating it to register the new dashboard route.
