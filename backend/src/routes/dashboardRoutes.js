const router = require("express").Router();
const authenticateToken = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const { getDashboard } = require("../controllers/dashboardController");
router.get("/", authenticateToken, requirePermission("view_leads"), getDashboard);
module.exports = router;
