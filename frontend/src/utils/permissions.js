export const hasPermission = (user, permission) => Array.isArray(user?.permissions) && user.permissions.includes(permission);
export const canManageUsers = (user) => user?.role === "admin" && hasPermission(user, "manage_users");
export const canManageLeadRecord = (user, lead) => user?.role === "admin" || (user?.role !== "catalog_manager" && user?.id != null && lead?.owner_id != null && Number(user.id) === Number(lead.owner_id));
export const canViewLeadRecord = (user, lead) => hasPermission(user, "view_leads") && !!lead && (["admin", "catalog_manager"].includes(user?.role) || (user?.id != null && lead.owner_id != null && Number(user.id) === Number(lead.owner_id)));
