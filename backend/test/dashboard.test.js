const test = require("node:test");
const assert = require("node:assert/strict");
const databasePath = require.resolve("../src/config/database");
const calls = [];
let missingHistory = false;
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes("lead_activities") && missingHistory) throw Object.assign(new Error("missing"), { code: "42P01" });
    return { rows: sql.includes("SELECT l.*") ? [{ id: 1, owner_id: 7 }] : [] };
  },
} };
const { getDashboard } = require("../src/controllers/dashboardController");
async function run(role) {
  calls.length = 0;
  const response = { json(body) { this.body = body; return this; }, status(code) { this.code = code; return this; } };
  await getDashboard({ user: { id: 7, role, full_name: "Account" }, query: { role: "admin", owner_id: 1 } }, response);
  return response;
}
test("sales scopes leads, activity and latest timestamps on the server", async () => {
  const response = await run("sales");
  assert.equal(response.body.canViewTeam, false);
  assert.equal(response.body.scope, "personal");
  assert.equal(calls.length, 3);
  calls.forEach(({ sql, values }) => { assert.ok(sql.includes("WHERE l.owner_id = $1")); assert.deepEqual(values, [7]); });
});
test("admin scope is organization-wide and allows team UI", async () => {
  const response = await run("admin");
  assert.equal(response.body.canViewTeam, true);
  assert.equal(response.body.scope, "organization");
  calls.forEach(({ sql, values }) => { assert.ok(!sql.includes("WHERE l.owner_id")); assert.deepEqual(values, []); });
});
test("catalog manager retains existing read-only visibility but no team tab", async () => {
  const response = await run("catalog_manager");
  assert.equal(response.body.scope, "organization");
  assert.equal(response.body.canViewTeam, false);
});
test("missing legacy activity table does not break real lead analytics", async () => {
  missingHistory = true;
  const response = await run("sales");
  missingHistory = false;
  assert.equal(response.body.activityAvailable, false);
  assert.equal(response.body.leads.length, 1);
  assert.deepEqual(response.body.activities, []);
});
test("unknown roles cannot gain organization visibility", async () => {
  const response = await run("unexpected");
  assert.equal(response.body.canViewTeam, false);
  assert.equal(response.body.scope, "personal");
});
