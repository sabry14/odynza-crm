const router = require("express").Router();
const authenticateToken = require("../middleware/auth");
const { requireUserAdmin } = require("../middleware/permissions");
const { getUsers, updateUser } = require("../controllers/usersController");
router.use(authenticateToken, requireUserAdmin);
router.get("/", getUsers);
router.patch("/:id", updateUser);
module.exports = router;
