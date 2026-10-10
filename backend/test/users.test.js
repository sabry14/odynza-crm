const test = require("node:test");
const assert = require("node:assert/strict");
const path = require.resolve("../src/config/database");
let target, roleExists, adminCount, actor, failUpdate;
const calls = [];
const client = { release() { calls.push({ sql: "RELEASE" }); }, async query(sql, values) {
  calls.push({ sql, values });
  if (sql.includes("u.is_active, r.name AS role")) return { rows: actor ? [actor] : [] };
  if (sql.includes("FOR UPDATE OF u")) return { rows: target ? [target] : [] };
  if (sql.includes("SELECT name FROM roles")) return { rows: roleExists ? [{ name: values[0] === 1 ? "admin" : "sales" }] : [] };
  if (sql.includes("COUNT(*)::int AS count")) return { rows: [{ count: adminCount }] };
  if (sql.startsWith("UPDATE users")) {
    if (failUpdate) throw new Error("test database failure");
    return { rows: [] };
  }
  return { rows: [{ ...target, lead_count: 3 }] };
} };
require.cache[path] = { id: path, filename: path, loaded: true, exports: { connect: async () => client, query: client.query.bind(client) } };
const { updateUser, getUsers } = require("../src/controllers/usersController");
const admin = { id: 1, role: "admin", permissions: ["manage_users", "manage_roles"] };
function reset() {
  target = { id: 2, role: "sales", role_id: 2, is_active: true }; roleExists = true; adminCount = 2;
  actor = { ...admin, is_active: true }; failUpdate = false; calls.length = 0;
}
async function run(body, user = admin, id = "2") {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await updateUser({ body, user, params: { id } }, res);
  return res;
}
test("role changes and deactivation use a transaction; preserve lead ownership", async () => {
  reset(); const res = await run({ role_id: 1, is_active: false });
  assert.ok(!res.code);
  const update = calls.find((call) => call.sql.startsWith("UPDATE users"));
  assert.deepEqual(update.values, [1, false, 2]);
  assert.ok(calls.some((call) => call.sql.includes("pg_advisory_xact_lock")));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
  assert.ok(!calls.some((call) => /(?:UPDATE|DELETE FROM) leads/.test(call.sql)));
});
test("invalid fields, booleans, roles and IDs are rejected before writes", async () => {
  for (const [body, id] of [[{ password: "secret" }, "2"], [{ is_active: "false" }, "2"], [{ role_id: "1" }, "2"], [{ is_active: false }, "bad"], [{}, "2"]]) {
    reset(); assert.equal((await run(body, admin, id)).code, 400);
    assert.ok(!calls.some((call) => call.sql.startsWith("UPDATE users")));
  }
});
test("an admin cannot deactivate or demote their own account", async () => {
  reset(); target = { id: 1, role: "admin", role_id: 1, is_active: true };
  assert.equal((await run({ is_active: false }, admin, "1")).code, 409);
  assert.equal((await run({ role_id: 2 }, admin, "1")).code, 409);
});
test("last active admin is protected", async () => {
  reset(); target = { id: 2, role: "admin", role_id: 1, is_active: true }; adminCount = 1;
  assert.equal((await run({ is_active: false })).code, 409);
  assert.equal((await run({ role_id: 2 })).code, 409);
  assert.ok(!calls.some((call) => call.sql.startsWith("UPDATE users")));
});
test("unknown users and roles do not update any account", async () => {
  reset(); target = null; assert.equal((await run({ is_active: false })).code, 404);
  reset(); roleExists = false; assert.equal((await run({ role_id: 999 })).code, 400);
});
test("assigning roles requires manage_roles independently", async () => {
  reset(); assert.equal((await run({ role_id: 1 }, { ...admin, permissions: ["manage_users"] })).code, 403);
  assert.equal(calls.length, 0);
});
test("revoked administrator access is rechecked after locking", async () => {
  reset(); actor.role = "sales";
  assert.equal((await run({ is_active: false })).code, 403);
  assert.ok(!calls.some((call) => call.sql.startsWith("UPDATE users")));
});
test("database errors rollback and release the connection", async () => {
  reset(); failUpdate = true;
  assert.equal((await run({ is_active: false })).code, 500);
  assert.ok(calls.some((call) => call.sql === "ROLLBACK"));
  assert.equal(calls.at(-1).sql, "RELEASE");
});
test("listing accounts never selects password hashes or tokens", async () => {
  reset(); const res = { json(body) { this.body = body; return this; }, status() { return this; } };
  await getUsers({}, res);
  assert.ok(calls.every((call) => !call.sql.includes("password_hash")));
  assert.ok(calls.every((call) => !call.sql.includes("u.*")));
});
