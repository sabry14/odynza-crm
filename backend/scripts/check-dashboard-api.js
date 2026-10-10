const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const pool = require("../src/config/database");
async function main() {
  const base = process.env.DASHBOARD_CHECK_URL || "http://localhost:5001/api";
  const unauthenticated = await fetch(`${base}/dashboard`);
  assert.equal(unauthenticated.status, 401);
  const users = await pool.query("SELECT u.id, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=true");
  for (const user of users.rows) {
    // Deliberately incorrect admin claim verifies the middleware uses the database.
    const token = jwt.sign({ id: user.id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2m" });
    const response = await fetch(`${base}/dashboard?role=admin`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.user.role, user.role);
    assert.equal(data.canViewTeam, user.role === "admin");
    if (!["admin", "catalog_manager"].includes(user.role)) assert.ok(data.leads.every((lead) => Number(lead.owner_id) === Number(user.id)));
    console.log(JSON.stringify({ role: user.role, status: response.status, scopedLeads: data.leads.length, currentDatabaseRoleVerified: true }));
  }
}
main().catch((error) => { console.error("Dashboard API check:", error.message); process.exitCode = 1; }).finally(() => pool.end());
