const express = require("express");

const authenticateToken = require("../middleware/auth");

const {
  getLeads,
  createLead,
  deleteLead,
  getLeadActivities,
  importLeads,
  updateLead,
} = require("../controllers/leadsController");

const router = express.Router();

router.get("/", authenticateToken, getLeads);

router.post("/import", authenticateToken, importLeads);

router.post("/", authenticateToken, createLead);

router.get("/:id/activities", authenticateToken, getLeadActivities);

router.put("/:id", authenticateToken, updateLead);

router.delete("/:id", authenticateToken, deleteLead);

module.exports = router;
