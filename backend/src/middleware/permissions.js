function hasPermission(user, permission) {
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    return next();
  };
}

function requireUserAdmin(req, res, next) {
  if (req.user?.role !== "admin" || !hasPermission(req.user, "manage_users")) {
    return res.status(403).json({ message: "User management is restricted to authorized administrators" });
  }
  return next();
}

// Editing a record, changing its stage and adding notes are separate permissions.
function requiredLeadUpdatePermissions(body) {
  const permissions = new Set();
  if (Object.hasOwn(body, "status")) permissions.add("update_lead_status");
  if (Object.hasOwn(body, "notes")) permissions.add("add_lead_notes");
  if (["name", "company", "email", "phone", "domain", "industry", "deal_value", "source", "owner_id"].some((field) => Object.hasOwn(body, field))) permissions.add("edit_leads");
  return [...permissions];
}

function requireLeadUpdate(req, res, next) {
  const required = requiredLeadUpdatePermissions(req.body || {});
  if (required.some((permission) => !hasPermission(req.user, permission))) {
    return res.status(403).json({ message: "You do not have permission to change one or more of these lead fields" });
  }
  return next();
}

module.exports = { hasPermission, requirePermission, requireUserAdmin, requireLeadUpdate, requiredLeadUpdatePermissions };
