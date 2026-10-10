const express = require("express");

const authenticateToken = require("../middleware/auth");
const { requirePermission, requireLeadUpdate } = require("../middleware/permissions");

const {
  getLeads,
  createLead,
  deleteLead,
  getLeadActivities,
  importLeads,
  updateLead,
} = require("../controllers/leadsController");

const router = express.Router();

router.get("/", authenticateToken, requirePermission("view_leads"), getLeads);

router.post("/import", authenticateToken, requirePermission("create_leads"), importLeads);

router.post("/", authenticateToken, requirePermission("create_leads"), createLead);

router.get("/:id/activities", authenticateToken, requirePermission("view_leads"), getLeadActivities);

router.put("/:id", authenticateToken, requireLeadUpdate, updateLead);

router.delete("/:id", authenticateToken, requirePermission("delete_leads"), deleteLead);

module.exports = router;
