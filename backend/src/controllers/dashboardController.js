const pool = require("../config/database");

async function getDashboard(req, res) {
  const user = req.user;
  // Preserve the existing catalog-manager read-only organization scope.
  const organizationScope = ["admin", "catalog_manager"].includes(user.role);
  const values = organizationScope ? [] : [user.id];
  const where = organizationScope ? "" : "WHERE l.owner_id = $1";
  try {
    const result = await pool.query(
      `SELECT l.*, ls.name AS status, u.full_name AS owner_name
       FROM leads l JOIN lead_statuses ls ON ls.id = l.status_id
       LEFT JOIN users u ON u.id = l.owner_id ${where}
       ORDER BY l.created_at DESC, l.id DESC`, values
    );
    let activities = [];
    let activityAvailable = true;
    let lastActivities = [];
    try {
      // No DDL or fabricated events on dashboard reads. Older databases may lack history.
      const recent = await pool.query(
        `SELECT a.id, a.lead_id, a.activity_type, a.title, a.description, a.created_at,
                u.full_name AS actor_name, l.name AS lead_name, l.company
         FROM lead_activities a JOIN leads l ON l.id = a.lead_id
         LEFT JOIN users u ON u.id = a.actor_id ${where}
         ORDER BY a.created_at DESC, a.id DESC LIMIT 50`, values
      );
      const latest = await pool.query(
        `SELECT a.lead_id, MAX(a.created_at) AS last_activity_at
         FROM lead_activities a JOIN leads l ON l.id = a.lead_id ${where}
         GROUP BY a.lead_id`, values
      );
      activities = recent.rows;
      lastActivities = latest.rows;
    } catch (error) {
      if (!["42P01", "42703", "42501"].includes(error.code)) throw error;
      activityAvailable = false;
    }
    const lastById = new Map(lastActivities.map((a) => [a.lead_id, a.last_activity_at]));
    return res.json({
      user: { id: user.id, full_name: user.full_name, role: user.role },
      scope: organizationScope ? "organization" : "personal",
      canViewTeam: user.role === "admin",
      leads: result.rows.map((lead) => ({ ...lead, last_activity_at: lastById.get(lead.id) || null })),
      activities, activityAvailable, generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dashboard error:", error.message);
    return res.status(500).json({ message: "Unable to load the dashboard. Please try again." });
  }
}

module.exports = { getDashboard };
