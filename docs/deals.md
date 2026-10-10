# Deals workspace

The Deals sidebar item opens Board, List, and Closed views. It uses the existing authenticated CRM API and existing `leads` records, not a separate deals table or seeded demo dataset.

## Data rules

- Open opportunities are exactly Qualified, Proposal, and Negotiation leads. New Lead and Contacted stay in Leads, even when an estimated value is present.
- Closed contains Won and Lost records; legacy Closed Won/Closed Lost labels normalize to those outcomes.
- Summary cards show account-wide accessible opportunity totals, excluding Won/Lost values. Search, stage, owner, and closed-outcome filters apply to the views. Column counts and values reflect their visible cards.
- Values follow the current USD field. They are estimates, not ARR, invoices, payments, or collected revenue.
- Last recorded activity uses `last_activity_at` from the existing dashboard snapshot. Missing history is shown explicitly, not replaced with fabricated follow-ups or close dates.
- The drawer fetches full recorded activity for the selected lead. Notes edit the linked lead's existing note text; they do not create a separate note object.

## Actions and permissions

- Admin sees organization-wide permitted records with an owner filter. Sales sees its server-scoped records only. Catalog managers retain existing organization-wide read-only access. There is no role/view selector.
- Stage editing and dragging require both record-management scope and `update_lead_status`. Notes require scope and `add_lead_notes`. The existing backend independently enforces these permissions.
- Every stage movement requires confirmation. Cancel does not mutate data, and failed writes leave the record in its original stage.
- Successful changes use the server response and refresh the snapshot/history. A refresh failure after a successful save is distinguished from a failed save.
- Moving to Won/Lost places the record in Closed. Moving back to New Lead/Contacted removes it from active Deals but preserves it in Leads.
- New opportunity requires `create_leads` and opens the existing intake with Qualified selected. Only the three active opportunity stages are offered in that flow. It creates one linked lead, then returns to Deals.
- No delete action, prototype simulation toolbar, future-concept toggle, automated email/task claim, sample proposal download, or invented agent assignment is included.

## Verification

- Frontend: `cd frontend` then `npm test` and `npm run build`.
- Backend: `cd backend` then `node --test test/*.test.js`.
- `deals.test.js` covers eligibility, sums, filters, sorting, normalized outcomes, and per-field permission patches.
- `deals-mutations.test.js` runs the real lead update controller and permission middleware against a mocked database. It tests saved stages, note edits/clears, record scope, rejected permissions, invalid stages, and write failures without touching real data.
- Browser QA uses an isolated temporary loopback harness: production-record writes are blocked; interactive mutation tests use memory-only fictional records. Test harness files are removed after verification.

The pasted Stitch HTML is a visual reference only. Production uses the existing React shell, theme tokens, logos, auth context, and backend rather than its Tailwind CDN, fictional data, or inline demo scripts.
