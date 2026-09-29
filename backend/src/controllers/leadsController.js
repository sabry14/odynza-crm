const pool = require("../config/database");

const STATUS_IDS = {
  "New Lead": 1,
  Contacted: 2,
  Qualified: 3,
  Proposal: 4,
  Negotiation: 5,
  Won: 6,
  "Closed Won": 6,
  Lost: 7,
  "Closed Lost": 7,
};

async function getLeads(req, res) {
  try {
    const { id: userId, role } = req.user;

    let query;
    let values = [];

    if (role === "admin" || role === "catalog_manager") {
      query = `
        SELECT l.*, ls.name AS status, u.full_name AS owner_name
        FROM leads l
        JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN users u ON l.owner_id = u.id
        ORDER BY l.created_at DESC
      `;
    } else {
      query = `
        SELECT l.*, ls.name AS status, u.full_name AS owner_name
        FROM leads l
        JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = $1
        ORDER BY l.created_at DESC
      `;
      values = [userId];
    }

    const result = await pool.query(query, values);
    return res.json({ leads: result.rows });
  } catch (error) {
    console.error("Get leads error:", error);
    return res.status(500).json({ message: "Failed to fetch leads" });
  }
}

async function createLead(req, res) {

  console.log("CONTENT TYPE:", req.headers["content-type"]);
  console.log("REQ BODY:", req.body);

  const client = await pool.connect();

  try {
    const { id: userId, role } = req.user;
    const {
      name,
      company,
      email,
      phone = null,
      domain = null,
      industry = null,
      status = "New Lead",
      deal_value = 0,
      source = null,
      notes = null,
      owner_id,
    } = req.body;

    if (!name?.trim() || !company?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name, company, and email are required",
      });
    }

    const statusId = STATUS_IDS[status];
    if (!statusId) {
      return res.status(400).json({ message: "Invalid lead status" });
    }

    // Sales users can only create leads for themselves.
    // Admin/catalog manager can explicitly choose another owner.
    const effectiveOwnerId =
      role === "admin" || role === "catalog_manager"
        ? Number(owner_id) || userId
        : userId;

    await client.query("BEGIN");

    const leadResult = await client.query(
      `
        INSERT INTO leads
          (name, company, email, phone, domain, industry, owner_id, deal_value, lead_score, win_probability, status_id, source, notes)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9, $10, $11)
        RETURNING *
      `,
      [
        name.trim(),
        company.trim(),
        email.trim().toLowerCase(),
        phone,
        domain,
        industry,
        effectiveOwnerId,
        Number(deal_value) || 0,
        statusId,
        source,
        notes,
      ]
    );

    const lead = leadResult.rows[0];

    const enriched = await client.query(
      `
        SELECT l.*, ls.name AS status, u.full_name AS owner_name
        FROM leads l
        JOIN lead_statuses ls ON l.status_id = ls.id
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.id = $1
      `,
      [lead.id]
    );

    await client.query("COMMIT");
    return res.status(201).json({ lead: enriched.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create lead error:", error);
    return res.status(500).json({ message: "Failed to create lead" });
  } finally {
    client.release();
  }
}

module.exports = {
  getLeads,
  createLead,
};
