const test = require("node:test");
const assert = require("node:assert/strict");
const { hasPermission, requirePermission, requireUserAdmin, requireLeadUpdate } = require("../src/middleware/permissions");
const sales = { role: "sales", permissions: ["view_leads", "create_leads", "edit_leads", "update_lead_status", "add_lead_notes"] };
function run(middleware, user, body = {}) {
  let passed = false;
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  middleware({ user, body }, res, () => { passed = true; });
  return { passed, status: res.code };
}
test("sales cannot delete even if they own the lead", () => {
  assert.equal(run(requirePermission("delete_leads"), sales).status, 403);
  assert.equal(run(requirePermission("delete_leads"), { ...sales, role: "admin" }).status, 403);
  assert.equal(run(requirePermission("delete_leads"), { role: "admin", permissions: ["delete_leads"] }).passed, true);
});
test("missing permissions fail closed, without role-name bypasses", () => {
  assert.equal(hasPermission(null, "edit_leads"), false);
  assert.equal(run(requirePermission("view_leads"), { role: "admin" }).status, 403);
});
test("user management requires admin AND manage_users", () => {
  assert.equal(run(requireUserAdmin, sales).status, 403);
  assert.equal(run(requireUserAdmin, { role: "sales", permissions: ["manage_users"] }).status, 403);
  assert.equal(run(requireUserAdmin, { role: "admin", permissions: [] }).status, 403);
  assert.equal(run(requireUserAdmin, { role: "admin", permissions: ["manage_users"] }).passed, true);
});
test("catalog managers cannot create, edit or delete leads", () => {
  const user = { role: "catalog_manager", permissions: ["view_leads", "view_catalog", "edit_catalog"] };
  assert.equal(run(requirePermission("create_leads"), user).status, 403);
  assert.equal(run(requireLeadUpdate, user, { name: "Changed" }).status, 403);
  assert.equal(run(requireLeadUpdate, user, { status: "Won" }).status, 403);
  assert.equal(run(requireLeadUpdate, user, { notes: "Changed" }).status, 403);
});
test("mixed patches must satisfy every affected permission", () => {
  const notesOnly = { permissions: ["add_lead_notes"] };
  assert.equal(run(requireLeadUpdate, notesOnly, { notes: "Note" }).passed, true);
  assert.equal(run(requireLeadUpdate, notesOnly, { notes: "Note", status: "Won" }).status, 403);
  assert.equal(run(requireLeadUpdate, { permissions: ["edit_leads"] }, { name: "Name", notes: "Note" }).status, 403);
  assert.equal(run(requireLeadUpdate, sales, { name: "Name", status: "Won", notes: "Note" }).passed, true);
});
