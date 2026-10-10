# Account permissions and Users administration

The application uses one shared workspace. Navigation and actions are derived
from the current account's database role and permissions, not a role selector
or local-storage claims.

## Authorization

Authentication loads `roles`, `role_permissions` and `permissions` on every
authenticated request. Inactive/deleted accounts fail authentication. Missing
permissions fail closed; even the admin role is not a permission bypass.

| Operation | Required permission |
| --- | --- |
| Leads, activity and dashboard | `view_leads` |
| Create/import leads | `create_leads` |
| Edit lead fields | `edit_leads` |
| Change a lead stage | `update_lead_status` |
| Add/change lead notes | `add_lead_notes` |
| Delete leads | `delete_leads` |
| Users list/status management | Admin role AND `manage_users` |
| Assign user roles | Above AND `manage_roles` |

Mixed lead updates must satisfy every affected permission. Record scope remains
separate: admin views/manages all leads; sales views/manages its assigned leads;
catalog managers retain organization-wide read-only lead visibility. Catalog
visibility is gated by `view_catalog`; the existing static catalog has no write API.

`GET /api/auth/me` returns the authoritative permission list. The frontend loads
it before rendering protected pages, refreshes on focus and every minute, and
refreshes after denied API requests. The server remains authoritative between
frontend refreshes. When access changes, cached lead/dashboard pages remount and
out-of-scope Lead Details are closed.

## Users page

The Administration > Users sidebar entry appears only for an admin with
`manage_users`. It lists safe account fields, assigned-lead counts, last sign-in,
roles and active status. Password hashes and tokens are never selected or returned.
Search, role/status filters, refresh, role permission previews and a confirmation
step are included. Light/dark and narrow layouts use the shared CRM theme.

- `GET /api/users`: account list and database roles/permissions.
- `PATCH /api/users/:id`: only numeric `role_id` and boolean `is_active`.
- No account creation, password reset or permanent user deletion is provided here.
- Deactivation preserves users, assigned leads and activity history.
- Self-deactivation and self-demotion are rejected.
- The last active administrator cannot be disabled or demoted.
- User changes are transactional and serialized with an advisory lock; the actor's
  access is rechecked after acquiring the lock.

No schema migration is required. This feature does not modify existing role
assignments or permission mappings by itself.

## Tests

Run `node --test test/*.test.js` in backend and `npm test` / `npm run build` in
frontend. The user-mutation tests use a mocked database; no real account changes
are made. `node scripts/check-permissions-api.js` verifies the running API against
real accounts using short-lived test tokens, deliberately spoofed token claims,
and denied writes targeting an ID first proven absent. Set `PERMISSIONS_CHECK_URL`
if the backend is not at `http://localhost:5000/api`.
