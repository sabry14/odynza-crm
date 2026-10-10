import test from "node:test";
import assert from "node:assert/strict";
import { summarize, groupLeads, stageGroups, creationSeries, attentionItems, teamGroups, csvText } from "./dashboard.js";

const now = new Date("2026-10-06T12:00:00Z");
const leads = [
  { id: 1, status: "New Lead", deal_value: "100", owner_id: 1, owner_name: "Sales A", source: "Web", created_at: "2026-09-01", updated_at: "2026-09-01" },
  { id: 2, status: "Proposal", deal_value: 0, owner_id: 2, owner_name: "Sales B", source: " web ", created_at: "2026-10-05", updated_at: "2026-10-05" },
  { id: 3, status: "Closed Won", deal_value: 200, owner_id: 1, owner_name: "Sales A", created_at: "2026-09-15" },
  { id: 4, status: "Lost", deal_value: 999, owner_id: null, created_at: "2026-09-20" },
];
test("snapshot metrics exclude closed leads and use Won / (Won + Lost)", () => {
  assert.deepEqual(summarize(leads), { total: 4, active: 2, openValue: 100, qualified: 1, qualifiedValue: 0, won: 1, lost: 1, wonValue: 200, winRate: 50 });
  assert.equal(summarize([]).winRate, null);
});
test("groups preserve unknown fields and normalize case/whitespace", () => {
  const groups = groupLeads(leads, "source");
  assert.equal(groups.find((g) => g.key === "web").count, 2);
  assert.equal(groups.find((g) => g.label === "Not recorded").count, 2);
  assert.equal(groups.find((g) => g.label === "Not recorded").value, 0);
  assert.equal(stageGroups(leads).reduce((s, g) => s + g.count, 0), 4);
  assert.equal(stageGroups(leads, true).reduce((s, g) => s + g.value, 0), 100);
});
test("attention deduplicates leads, ignores closed leads and respects recent activity", () => {
  const items = attentionItems(leads, now);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].reasons.map((r) => r.type), ["new", "idle"]);
  assert.equal(items[1].reasons[0].type, "value");
  assert.equal(attentionItems([{ ...leads[0], last_activity_at: "2026-10-06" }], now)[0].reasons.length, 1);
  assert.equal(attentionItems([{ id: 5, status: "New Lead" }], now).length, 0);
});
test("creation buckets use UTC Monday boundaries, zero-fill and ignore future dates", () => {
  const weekly = creationSeries([...leads, { created_at: "2026-11-01" }], "weekly", now);
  assert.equal(weekly.length, 8);
  assert.equal(weekly.at(-1).start, Date.parse("2026-10-05"));
  assert.equal(weekly.at(-1).count, 1);
  assert.equal(weekly.reduce((s, b) => s + b.count, 0), 4);
  const monthly = creationSeries(leads, "monthly", now);
  assert.equal(monthly.length, 12);
  assert.equal(monthly.at(-1).count, 1);
  assert.equal(monthly.at(-2).count, 3);
});
test("owner summaries include unassigned leads and separate distinct accounts", () => {
  const groups = teamGroups(leads);
  assert.equal(groups.length, 3);
  assert.equal(groups.find((g) => g.key === "1").openValue, 100);
  assert.equal(groups.find((g) => g.key === "unassigned").lost, 1);
});
test("CSV escapes quotes and neutralizes spreadsheet formulas", () => {
  const csv = csvText(["Name"], [['=HYPERLINK("evil")'], ["a,b"]]);
  assert.ok(csv.includes(`"'=HYPERLINK(""evil"")"`));
  assert.ok(csv.includes('"a,b"'));
});
