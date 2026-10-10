import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, canManageUsers, canManageLeadRecord, canViewLeadRecord } from "./permissions.js";
const sales = { id: 7, role: "sales", permissions: ["view_leads", "edit_leads", "add_lead_notes"] };
test("sales lead ownership does not grant Delete or user management", () => {
  assert.equal(canManageLeadRecord(sales, { owner_id: 7 }), true);
  assert.equal(hasPermission(sales, "delete_leads"), false);
  assert.equal(canManageUsers(sales), false);
});
test("Users navigation is admin-only and requires manage_users", () => {
  assert.equal(canManageUsers({ role: "admin", permissions: ["manage_users"] }), true);
  assert.equal(canManageUsers({ role: "sales", permissions: ["manage_users"] }), false);
  assert.equal(canManageUsers({ role: "admin", permissions: [] }), false);
});
test("record scope distinguishes admin, owner, other sales and catalog manager", () => {
  assert.equal(canManageLeadRecord(sales, { owner_id: 8 }), false);
  assert.equal(canManageLeadRecord({ ...sales, role: "catalog_manager" }, { owner_id: 7 }), false);
  assert.equal(canManageLeadRecord({ role: "admin" }, { owner_id: 8 }), true);
  assert.equal(canManageLeadRecord(null, { owner_id: null }), false);
});
test("view access also respects permissions and ownership after an admin demotion", () => {
  assert.equal(canViewLeadRecord({ role: "admin", permissions: ["view_leads"] }, { owner_id: 8 }), true);
  assert.equal(canViewLeadRecord(sales, { owner_id: 8 }), false);
  assert.equal(canViewLeadRecord({ role: "admin", permissions: [] }, { owner_id: 8 }), false);
  assert.equal(canViewLeadRecord({ role: "catalog_manager", permissions: ["view_leads"] }, { owner_id: 8 }), true);
});
