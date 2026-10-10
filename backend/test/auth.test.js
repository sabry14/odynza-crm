const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
process.env.JWT_SECRET = "dashboard-test-secret-only";
let account = { id: 7, full_name: "Sales", role: "sales", is_active: true };
let unavailable = false;
const path = require.resolve("../src/config/database");
require.cache[path] = { id: path, filename: path, loaded: true, exports: { query: async () => {
  if (unavailable) throw new Error("offline");
  return { rows: account ? [account] : [] };
} } };
const authenticate = require("../src/middleware/auth");
async function check(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  let passed = false;
  await authenticate(req, res, () => { passed = true; });
  return { req, res, passed };
}
test("current database role overrides an old admin claim", async () => {
  const result = await check(jwt.sign({ id: 7, role: "admin" }, process.env.JWT_SECRET));
  assert.equal(result.passed, true);
  assert.equal(result.req.user.role, "sales");
});
test("missing and invalid tokens are rejected", async () => {
  assert.equal((await check()).res.code, 401);
  assert.equal((await check("invalid")).res.code, 401);
});
test("disabled and deleted accounts cannot access CRM", async () => {
  const token = jwt.sign({ id: 7 }, process.env.JWT_SECRET);
  account.is_active = false;
  assert.equal((await check(token)).res.code, 401);
  account = null;
  assert.equal((await check(token)).res.code, 401);
});
test("database failure fails closed with a retryable response", async () => {
  unavailable = true;
  const result = await check(jwt.sign({ id: 7 }, process.env.JWT_SECRET));
  assert.equal(result.res.code, 503);
  assert.equal(result.passed, false);
});
test("public signup cannot choose an admin role", async () => {
  const database = require("../src/config/database");
  let assignedRole;
  database.query = async (sql, values) => {
    if (sql.includes("SELECT id FROM users")) return { rows: [] };
    if (sql.includes("SELECT id FROM roles")) return { rows: [{ id: 2 }] };
    if (sql.includes("INSERT INTO users")) { assignedRole = values[3]; return { rows: [{ id: 8 }] }; }
    return { rows: [{ id: 8, full_name: "Test", role: "sales", role_id: 2 }] };
  };
  const { signup } = require("../src/controllers/authController");
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await signup({ body: { full_name: "Test", email: "test@example.com", password: "test-only-password", role_id: 1 } }, res);
  assert.equal(res.code, 201);
  assert.equal(assignedRole, 2);
  assert.equal(res.body.user.role, "sales");
});
