const pool = require("../config/database");

async function getLeads(req, res) {
  try {
    const { id: userId, role } = req.user;

    let query;
    let values = [];

    if (role === "admin" || role === "catalog_manager") {
      query = `
        SELECT
          l.*,
          ls.name AS status,
          u.full_name AS owner_name
        FROM leads l
        JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN users u ON l.owner_id = u.id
        ORDER BY l.created_at DESC
      `;
    } else {
      query = `
        SELECT
          l.*,
          ls.name AS status,
          u.full_name AS owner_name
        FROM leads l
        JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = $1
        ORDER BY l.created_at DESC
      `;

      values = [userId];
    }

    const result = await pool.query(query, values);

    return res.json({
      leads: result.rows,
    });
  } catch (error) {
    console.error("Get leads error:", error);

    return res.status(500).json({
      message: "Failed to fetch leads",
    });
  }
}

module.exports = {
  getLeads,
};
