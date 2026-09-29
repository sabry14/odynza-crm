const express = require("express");
const authenticateToken = require("../middleware/auth");
const { getLeads, createLead } = require("../controllers/leadsController");

const router = express.Router();

router.get("/", authenticateToken, getLeads);
router.post("/", authenticateToken, createLead);

module.exports = router;
