// Read-only account checks, plus rejected writes targeting an ID proven absent.
// No user or lead is created, modified, deactivated or deleted by this check.
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const pool = require("../src/config/database");
async function main() {
  const base = process.env.PERMISSIONS_CHECK_URL || "http://localhost:5000/api";
  const absentId = 2147483647;
  const absent = await pool.query("SELECT EXISTS(SELECT 1 FROM leads WHERE id=$1) OR EXISTS(SELECT 1 FROM users WHERE id=$1) AS present", [absentId]);
  assert.equal(absent.rows[0].present, false, "Safety check: reserved test ID must not exist");
  const users = await pool.query("SELECT u.id, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=true ORDER BY u.id");
  for (const user of users.rows) {
    const token = jwt.sign({ id: user.id, role: "admin", permissions: ["delete_leads", "manage_users"] }, process.env.JWT_SECRET, { expiresIn: "2m" });
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const accountResponse = await fetch(`${base}/auth/me`, { headers });
    assert.equal(accountResponse.status, 200);
    const account = (await accountResponse.json()).user;
    assert.equal(account.role, user.role);
    assert.ok(Array.isArray(account.permissions));
    const response = await fetch(`${base}/users`, { headers });
    if (user.role === "admin") {
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.users.length > 0);
      assert.ok(data.users.every((u) => !Object.hasOwn(u, "password_hash")));
      assert.ok(data.roles.every((role) => Array.isArray(role.permissions)));
    } else {
      assert.equal(response.status, 403);
      const patch = await fetch(`${base}/users/${absentId}`, { method: "PATCH", headers, body: JSON.stringify({ is_active: false }) });
      assert.equal(patch.status, 403);
    }
    if (!account.permissions.includes("delete_leads")) {
      const deletion = await fetch(`${base}/leads/${absentId}`, { method: "DELETE", headers });
      assert.equal(deletion.status, 403);
    }
    console.log(JSON.stringify({ role: user.role, permissionsFromDatabase: true, usersAccess: response.status, deleteAllowed: account.permissions.includes("delete_leads"), verified: true }));
  }
}
main().catch((error) => { console.error("Permission API check:", error.message); process.exitCode = 1; }).finally(() => pool.end());
