const express = require("express");
const authenticateToken = require("../middleware/auth");
const { getLeads } = require("../controllers/leadsController");

const router = express.Router();

router.get("/", authenticateToken, getLeads);

module.exports = router;
