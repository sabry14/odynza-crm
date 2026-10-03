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

async function ensureActivityTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      activity_type VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Existing installations may have an earlier lead_activities table.
  // Add the columns used by the current activity feed without removing data.
  await client.query(`
    ALTER TABLE lead_activities
      ADD COLUMN IF NOT EXISTS actor_id INTEGER,
      ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS lead_activities_lead_created_at_idx
    ON lead_activities (lead_id, created_at DESC)
  `);
}

async function recordActivity(client, leadId, actorId, activityType, title, description) {
  await ensureActivityTable(client);
  await client.query(
    `
      INSERT INTO lead_activities
        (lead_id, actor_id, activity_type, title, description)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [leadId, actorId, activityType, title, description]
  );
}

async function recordActivitySafely(client, leadId, actorId, activityType, title, description) {
  try {
    await recordActivity(client, leadId, actorId, activityType, title, description);
  } catch (error) {
    // Activity history must never prevent a lead from being created or updated.
    console.error("Record lead activity error:", error);
  }
}

function canManageLead(role, ownerId, userId) {
  return role === "admin" || (role !== "catalog_manager" && Number(ownerId) === Number(userId));
}

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

    res.json({ leads: result.rows });
  } catch (error) {
    console.error("Get leads error:", error);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
}

async function createLead(req, res) {
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
      return res.status(400).json({
        message: "Invalid lead status",
      });
    }

    const effectiveOwnerId =
      role === "admin"
        ? Number(owner_id) || userId
        : userId;

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO leads
      (
        name,
        company,
        email,
        phone,
        domain,
        industry,
        owner_id,
        deal_value,
        lead_score,
        win_probability,
        status_id,
        source,
        notes
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,0,0,$9,$10,$11
      )
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

    await recordActivitySafely(
      client,
      result.rows[0].id,
      userId,
      "created",
      "Lead created",
      `${name.trim()} was added to the CRM.`
    );

    const enriched = await client.query(
      `
      SELECT
        l.*,
        ls.name AS status,
        u.full_name AS owner_name
      FROM leads l
      JOIN lead_statuses ls ON l.status_id = ls.id
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.id = $1
      `,
      [result.rows[0].id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      lead: enriched.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create lead error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A lead with this email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create lead",
    });
  } finally {
    client.release();
  }
}

async function importLeads(req, res) {
  const client = await pool.connect();

  try {
    const { id: userId } = req.user;
    const leads = Array.isArray(req.body?.leads) ? req.body.leads : [];

    if (!leads.length) {
      return res.status(400).json({
        message: "No leads supplied",
      });
    }

    await client.query("BEGIN");

    let imported = 0;
    const conflicts = [];

    for (let i = 0; i < leads.length; i += 1) {
      const lead = leads[i];

      const name = String(lead.name || "").trim();
      const company = String(lead.company || "").trim();
      const email = String(lead.email || "").trim().toLowerCase();

      const phone = lead.phone
        ? String(lead.phone).trim()
        : null;

      const domain = lead.domain
        ? String(lead.domain).trim()
        : null;

      const industry = lead.industry
        ? String(lead.industry).trim()
        : null;

      const status = lead.status
        ? String(lead.status).trim()
        : "New Lead";

      const source = lead.source
        ? String(lead.source).trim()
        : null;

      const notes = lead.notes
        ? String(lead.notes).trim()
        : null;

      const dealValueText = String(
        lead.deal_value ?? ""
      )
        .replace(/,/g, "")
        .trim();

      const dealValue =
        dealValueText === ""
          ? 0
          : Number(dealValueText);

      if (!name || !company || !email) {
        conflicts.push({
          row: i + 2,
          message:
            "Name, company, and email are required",
        });
        continue;
      }

      if (!STATUS_IDS[status]) {
        conflicts.push({
          row: i + 2,
          message: `Invalid lead status "${status}"`,
        });
        continue;
      }

      if (
        !Number.isFinite(dealValue) ||
        dealValue < 0
      ) {
        conflicts.push({
          row: i + 2,
          message:
            "Deal value must be a valid number",
        });
        continue;
      }

      try {
        const inserted = await client.query(
          `
          INSERT INTO leads
          (
            name,
            company,
            email,
            phone,
            domain,
            industry,
            owner_id,
            deal_value,
            lead_score,
            win_probability,
            status_id,
            source,
            notes
          )
          VALUES
          (
            $1,$2,$3,$4,$5,$6,$7,$8,0,0,$9,$10,$11
          )
          RETURNING id
          `,
          [
            name,
            company,
            email,
            phone,
            domain,
            industry,
            userId,
            dealValue,
            STATUS_IDS[status],
            source,
            notes,
          ]
        );

        await recordActivitySafely(
          client,
          inserted.rows[0].id,
          userId,
          "imported",
          "Lead imported",
          `${name} was imported from a CSV file.`
        );

        imported += 1;
      } catch (error) {
        if (error.code === "23505") {
          conflicts.push({
            row: i + 2,
            message:
              `A lead with email "${email}" already exists`,
          });
          continue;
        }

        throw error;
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      imported,
      conflicts,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Import leads error:", error);

    res.status(500).json({
      message: "Failed to import leads",
    });
  } finally {
    client.release();
  }
}

async function updateLead(req, res) {
  try {
    const leadId = Number(req.params.id);
    const { id: userId, role } = req.user;

    if (!Number.isInteger(leadId)) {
      return res.status(400).json({
        message: "Invalid lead id",
      });
    }

    const existing = await pool.query(
      `SELECT * FROM leads WHERE id = $1`,
      [leadId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    const currentLead = existing.rows[0];

    if (!canManageLead(role, currentLead.owner_id, userId)) {
      return res.status(403).json({
        message: role === "catalog_manager"
          ? "Catalog managers cannot edit leads"
          : "You can only edit your own leads",
      });
    }

    const {
      name,
      company,
      email,
      phone,
      domain,
      industry,
      status,
      deal_value,
      source,
      notes,
      owner_id,
    } = req.body || {};

    const fields = [];
    const values = [];
    let parameter = 1;

    function addField(column, value) {
      fields.push(`${column} = $${parameter}`);
      values.push(value);
      parameter++;
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      addField("name", String(name).trim());
    }

    if (company !== undefined) {
      if (!String(company).trim()) {
        return res.status(400).json({
          message: "Company cannot be empty",
        });
      }

      addField(
        "company",
        String(company).trim()
      );
    }

    if (email !== undefined) {
      if (!String(email).trim()) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      addField(
        "email",
        String(email).trim().toLowerCase()
      );
    }

    if (phone !== undefined) {
      addField("phone", phone || null);
    }

    if (domain !== undefined) {
      addField("domain", domain || null);
    }

    if (industry !== undefined) {
      addField("industry", industry || null);
    }

    if (source !== undefined) {
      addField("source", source || null);
    }

    if (notes !== undefined) {
      addField("notes", notes || null);
    }

    if (deal_value !== undefined) {
      const value = Number(deal_value);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message:
            "Deal value must be a valid number",
        });
      }

      addField("deal_value", value);
    }

    if (status !== undefined) {
      const statusId = STATUS_IDS[status];

      if (!statusId) {
        return res.status(400).json({
          message: "Invalid lead status",
        });
      }

      addField("status_id", statusId);
    }

    if (owner_id !== undefined) {
      if (role !== "admin") {
        return res.status(403).json({
          message:
            "Only admins can change lead owner",
        });
      }

      addField(
        "owner_id",
        Number(owner_id)
      );
    }

    if (fields.length === 0) {
      return res.status(400).json({
        message: "No changes supplied",
      });
    }

    fields.push("updated_at = NOW()");
    values.push(leadId);

    const result = await pool.query(
      `
      UPDATE leads
      SET ${fields.join(", ")}
      WHERE id = $${parameter}
      RETURNING *
      `,
      values
    );

    const activity = status !== undefined
      ? {
          type: "stage_changed",
          title: "Stage changed",
          description: `Stage changed to ${status}.`,
        }
      : notes !== undefined
        ? {
            type: "notes_updated",
            title: "Notes updated",
            description: notes ? "Lead notes were updated." : "Lead notes were cleared.",
          }
        : {
            type: "lead_updated",
            title: "Lead updated",
            description: "Lead details were updated.",
          };

    await recordActivitySafely(
      pool,
      leadId,
      userId,
      activity.type,
      activity.title,
      activity.description
    );

    const enriched = await pool.query(
      `
      SELECT
        l.*,
        ls.name AS status,
        u.full_name AS owner_name
      FROM leads l
      JOIN lead_statuses ls ON l.status_id = ls.id
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.id = $1
      `,
      [result.rows[0].id]
    );

    res.json({
      lead: enriched.rows[0],
    });
  } catch (error) {
    console.error("Update lead error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "A lead with this email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update lead",
    });
  }
}

async function getLeadActivities(req, res) {
  try {
    const leadId = Number(req.params.id);
    const { id: userId, role } = req.user;

    if (!Number.isInteger(leadId)) {
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const lead = await pool.query("SELECT owner_id FROM leads WHERE id = $1", [leadId]);

    if (lead.rowCount === 0) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (role !== "admin" && role !== "catalog_manager" && Number(lead.rows[0].owner_id) !== Number(userId)) {
      return res.status(403).json({ message: "You can only view your own leads" });
    }

    await ensureActivityTable(pool);

    const result = await pool.query(
      `
        SELECT a.*, u.full_name AS actor_name
        FROM lead_activities a
        LEFT JOIN users u ON u.id = a.actor_id
        WHERE a.lead_id = $1
        ORDER BY a.created_at DESC
      `,
      [leadId]
    );

    res.json({ activities: result.rows });
  } catch (error) {
    console.error("Get lead activities error:", error);
    // A missing activity table should not break Lead Details while its migration
    // is being applied. Other lead operations remain available.
    if (error.code === "42P01" || error.code === "42501") {
      return res.json({ activities: [] });
    }
    res.status(500).json({ message: "Failed to fetch lead activity" });
  }
}

async function deleteLead(req, res) {
  try {
    const leadId = Number(req.params.id);
    const { id: userId, role } = req.user;

    if (!Number.isInteger(leadId)) {
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const lead = await pool.query("SELECT owner_id FROM leads WHERE id = $1", [leadId]);

    if (lead.rowCount === 0) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!canManageLead(role, lead.rows[0].owner_id, userId)) {
      return res.status(403).json({
        message: role === "catalog_manager"
          ? "Catalog managers cannot delete leads"
          : "You can only delete your own leads",
      });
    }

    await pool.query("DELETE FROM leads WHERE id = $1", [leadId]);
    res.status(204).end();
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({ message: "Failed to delete lead" });
  }
}

module.exports = {
  getLeads,
  createLead,
  deleteLead,
  getLeadActivities,
  importLeads,
  updateLead,
};
