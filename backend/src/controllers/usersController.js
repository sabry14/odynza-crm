const pool = require("../config/database");
const { hasPermission } = require("../middleware/permissions");
const SAFE_USER_FIELDS = "u.id, u.full_name, u.email, u.role_id, u.is_active, u.created_at, u.updated_at, u.last_login, r.name AS role";

async function getUsers(req, res) {
  try {
    const users = await pool.query(
      `SELECT ${SAFE_USER_FIELDS}, (SELECT COUNT(*)::int FROM leads l WHERE l.owner_id=u.id) AS lead_count
       FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.full_name, u.id`
    );
    const roles = await pool.query(
      `SELECT r.id, r.name, r.description,
              ARRAY(SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id
                    WHERE rp.role_id=r.id ORDER BY p.name) AS permissions
       FROM roles r ORDER BY r.id`
    );
    return res.json({ users: users.rows, roles: roles.rows, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("List users error:", error.message);
    return res.status(500).json({ message: "Unable to load users" });
  }
}

async function updateUser(req, res) {
  const id = Number(req.params.id);
  const body = req.body || {};
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid user ID" });
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !["role_id", "is_active"].includes(key))) {
    return res.status(400).json({ message: "Only role and active status can be changed here" });
  }
  const roleChange = Object.hasOwn(body, "role_id");
  const activeChange = Object.hasOwn(body, "is_active");
  if (roleChange && (!Number.isSafeInteger(body.role_id) || body.role_id <= 0)) return res.status(400).json({ message: "Invalid role ID" });
  if (activeChange && typeof body.is_active !== "boolean") return res.status(400).json({ message: "Active status must be true or false" });
  if (roleChange && !hasPermission(req.user, "manage_roles")) return res.status(403).json({ message: "You do not have permission to assign roles" });

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    // Serialize admin changes so concurrent requests cannot remove all active admins.
    await client.query("SELECT pg_advisory_xact_lock(731024, 1)");
    // Recheck the actor after acquiring the lock: another admin may have revoked
    // their access while this request was waiting.
    const actor = await client.query(
      `SELECT u.is_active, r.name AS role,
              ARRAY(SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=u.role_id) AS permissions
       FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1`, [req.user.id]
    );
    const actorAccount = actor.rows[0];
    if (!actorAccount?.is_active || actorAccount.role !== "admin" || !hasPermission(actorAccount, "manage_users") || (roleChange && !hasPermission(actorAccount, "manage_roles"))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Your administrator access has changed. Please refresh your account." });
    }
    const target = await client.query(`SELECT ${SAFE_USER_FIELDS} FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 FOR UPDATE OF u`, [id]);
    if (!target.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }
    const current = target.rows[0];
    let nextRole = current.role;
    if (roleChange) {
      const role = await client.query("SELECT name FROM roles WHERE id=$1", [body.role_id]);
      if (!role.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Selected role does not exist" });
      }
      nextRole = role.rows[0].name;
    }
    const nextActive = activeChange ? body.is_active : current.is_active;
    if (Number(req.user.id) === id && (!nextActive || nextRole !== "admin")) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "You cannot deactivate your own account or remove your own admin role" });
    }
    if (current.role === "admin" && current.is_active && (!nextActive || nextRole !== "admin")) {
      const admins = await client.query("SELECT COUNT(*)::int AS count FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='admin' AND u.is_active=true");
      if (admins.rows[0].count <= 1) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "At least one active administrator must remain" });
      }
    }
    await client.query("UPDATE users SET role_id=$1, is_active=$2, updated_at=NOW() WHERE id=$3", [roleChange ? body.role_id : current.role_id, nextActive, id]);
    const updated = await client.query(`SELECT ${SAFE_USER_FIELDS}, (SELECT COUNT(*)::int FROM leads l WHERE l.owner_id=u.id) AS lead_count FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1`, [id]);
    await client.query("COMMIT");
    return res.json({ user: updated.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Update user error:", error.message);
    return res.status(500).json({ message: "Unable to update this user" });
  } finally { client?.release(); }
}

module.exports = { getUsers, updateUser };
