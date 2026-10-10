const test = require("node:test");
const assert = require("node:assert/strict");
const dbPath = require.resolve("../src/config/database");
let record, failUpdate;
const calls = [];
const stages = ["New Lead", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const pool = { async query(sql, values = []) {
  calls.push({ sql, values });
  if (sql.startsWith("SELECT * FROM leads")) return { rowCount: record ? 1 : 0, rows: record ? [{ ...record }] : [] };
  if (sql.includes("UPDATE leads")) {
    if (failUpdate) throw new Error("Test-only update failure");
    if (sql.includes("status_id = $1")) record.status_id = values[0];
    if (sql.includes("notes = $1")) record.notes = values[0];
    return { rows: [{ ...record }] };
  }
  if (sql.includes("ls.name AS status")) return { rows: [{ ...record, status: stages[record.status_id - 1], owner_name: "Test sales" }] };
  return { rows: [] };
} };
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: pool };
const { updateLead } = require("../src/controllers/leadsController");
const { requireLeadUpdate } = require("../src/middleware/permissions");
const sales = { id: 7, role: "sales", permissions: ["update_lead_status", "add_lead_notes"] };
function reset() { calls.length = 0; failUpdate = false; record = { id: 201, owner_id: 7, status_id: 3, notes: "Original notes", deal_value: 140000 }; }
async function run(body, user = sales) {
  const req = { body, user, params: { id: "201" } };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  let allowed = false;
  requireLeadUpdate(req, res, () => { allowed = true; });
  if (allowed) await updateLead(req, res);
  return res;
}
test("confirmed stages persist through the real lead controller with actual activity entries", async () => {
  for (const [stage, id] of [["Proposal", 4], ["Negotiation", 5], ["Won", 6], ["Lost", 7]]) {
    reset(); const res = await run({ status: stage });
    assert.equal(res.code, 200); assert.equal(res.body.lead.status, stage);
    const update = calls.find((call) => call.sql.includes("UPDATE leads"));
    assert.deepEqual(update.values, [id, 201]);
    assert.ok(!update.sql.includes("notes =")); assert.equal(record.notes, "Original notes");
    assert.deepEqual(calls.find((call) => call.sql.includes("INSERT INTO lead_activities")).values, [201, 7, "stage_changed", "Stage changed", `Stage changed to ${stage}.`]);
    assert.ok(!calls.some((call) => /DELETE FROM/.test(call.sql)));
  }
});
test("saved and cleared notes do not alter stage, value or ownership", async () => {
  for (const notes of ["Updated account notes", ""]) {
    reset(); const res = await run({ notes });
    assert.equal(res.code, 200); assert.equal(res.body.lead.notes, notes || null);
    assert.equal(record.status_id, 3); assert.equal(record.deal_value, 140000); assert.equal(record.owner_id, 7);
    assert.deepEqual(calls.find((call) => call.sql.includes("UPDATE leads")).values, [notes || null, 201]);
  }
});
test("another salesperson and a catalog manager cannot move or annotate records", async () => {
  for (const user of [{ ...sales, id: 8 }, { ...sales, role: "catalog_manager" }]) {
    reset(); assert.equal((await run({ status: "Won" }, user)).code, 403);
    assert.ok(!calls.some((call) => call.sql.includes("UPDATE leads")));
  }
});
test("permission checks independently guard notes and stages before SQL", async () => {
  reset(); assert.equal((await run({ status: "Won" }, { ...sales, permissions: ["add_lead_notes"] })).code, 403); assert.equal(calls.length, 0);
  reset(); assert.equal((await run({ notes: "Edit" }, { ...sales, permissions: ["update_lead_status"] })).code, 403); assert.equal(calls.length, 0);
});
test("invalid stages and failed writes cannot return a successful move", async () => {
  reset(); assert.equal((await run({ status: "Fake stage" })).code, 400); assert.equal(record.status_id, 3);
  reset(); failUpdate = true; assert.equal((await run({ status: "Won" })).code, 500); assert.equal(record.status_id, 3);
  assert.ok(!calls.some((call) => call.sql.includes("INSERT INTO lead_activities")));
});
