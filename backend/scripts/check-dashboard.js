// Read-only smoke check against the configured database. No credentials are printed.
const assert = require("node:assert/strict");
const pool = require("../src/config/database");
const { getDashboard } = require("../src/controllers/dashboardController");
async function main() {
  const users = await pool.query("SELECT u.id, u.full_name, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active = true");
  const roles = [...new Set(users.rows.map((user) => user.role))];
  for (const role of roles) {
    const user = users.rows.find((row) => row.role === role);
    const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await getDashboard({ user }, response);
    assert.ok(!response.code, response.body.message);
    if (!["admin", "catalog_manager"].includes(role)) assert.ok(response.body.leads.every((lead) => Number(lead.owner_id) === Number(user.id)));
    assert.equal(response.body.canViewTeam, role === "admin");
    console.log(JSON.stringify({ role, scope: response.body.scope, leads: response.body.leads.length, activities: response.body.activities.length, activityAvailable: response.body.activityAvailable, verified: true }));
  }
  if (!roles.length) console.log("No active accounts available for a database smoke test.");
}
main().catch((error) => { console.error("Database dashboard check:", error.message); process.exitCode = 1; }).finally(() => pool.end());
