import test from "node:test";
import assert from "node:assert/strict";
import { dealSummary, opportunityRecords, filterDeals, sortDeals, dealPatch, canUpdateDeal } from "./deals.js";
const lead = (id, status, deal_value, extra = {}) => ({ id, status, deal_value, company: `Company ${id}`, name: `Contact ${id}`, owner_id: 7, ...extra });
const records = [lead(1, "New Lead", 900), lead(2, "Contacted", 800), lead(3, "Qualified", "100"), lead(4, "Proposal", 200), lead(5, "Negotiation", 300), lead(6, "Won", 400), lead(7, "Lost", 500)];
test("opportunities exclude early leads; summaries exclude won and lost values", () => {
  assert.deepEqual(opportunityRecords(records).map((l) => l.id), [3, 4, 5, 6, 7]);
  assert.deepEqual(dealSummary(records), { open: 3, value: 600, average: 200, negotiating: 1, negotiationValue: 300, negotiationShare: 50 });
});
test("empty and invalid values cannot produce misleading infinite metrics", () => {
  assert.equal(dealSummary([]).negotiationShare, null);
  assert.equal(dealSummary([lead(1, "Qualified", Infinity), lead(2, "Proposal", -10), lead(3, "Negotiation", "bad")]).value, 0);
});
test("search, owner and stage filters intersect across board and list", () => {
  assert.deepEqual(filterDeals(records, { query: " CONTACT 4 ", owner: "7", stage: "Proposal", view: "list" }).map((l) => l.id), [4]);
  assert.equal(filterDeals(records, { owner: "8" }).length, 0);
  assert.equal(filterDeals(records, { query: "nothing" }).length, 0);
  assert.equal(filterDeals([lead(1, "Qualified", 0, { owner_id: null })], { owner: "unassigned" }).length, 1);
});
test("closed filters include legacy stage labels without inventing closing dates", () => {
  const closed = [...records, lead(8, "Closed Won", 50), lead(9, "Closed Lost", 75)];
  assert.deepEqual(filterDeals(closed, { view: "closed", closed: "Won" }).map((l) => l.id), [6, 8]);
  assert.deepEqual(filterDeals(closed, { view: "closed", closed: "Lost" }).map((l) => l.id), [7, 9]);
});
test("sorting is numeric, stable and does not mutate the original records", () => {
  const original = [...records];
  assert.deepEqual(sortDeals(records, "deal_value", "desc").map((l) => l.id), [1, 2, 7, 6, 5, 4, 3]);
  assert.deepEqual(records, original);
  const dates = [lead(1, "Proposal", 0), lead(2, "Proposal", 0, { last_activity_at: "2026-10-01" }), lead(3, "Proposal", 0, { last_activity_at: "2026-10-08" })];
  assert.deepEqual(sortDeals(dates, "last_activity_at", "asc").map((l) => l.id), [2, 3, 1]);
});
test("stage changes require record scope AND database permission", () => {
  const sales = { id: 7, role: "sales", permissions: ["update_lead_status"] };
  assert.deepEqual(dealPatch(sales, records[2], "status", "Proposal"), { status: "Proposal" });
  assert.throws(() => dealPatch({ ...sales, id: 8 }, records[2], "status", "Proposal"), /permission/);
  assert.throws(() => dealPatch({ ...sales, role: "admin", permissions: [] }, records[2], "status", "Proposal"), /permission/);
  assert.throws(() => dealPatch(sales, records[2], "status", "Fake stage"), /Invalid/);
  assert.equal(canUpdateDeal({ id: 7, role: "catalog_manager", permissions: ["update_lead_status"] }, records[2], "update_lead_status"), false);
});
test("notes save independently, including explicit clearing", () => {
  const user = { id: 7, role: "sales", permissions: ["add_lead_notes"] };
  assert.deepEqual(dealPatch(user, records[2], "notes", ""), { notes: "" });
  assert.throws(() => dealPatch(user, records[2], "status", "Won"), /permission/);
  assert.throws(() => dealPatch(user, records[2], "notes", null), /text/);
});
