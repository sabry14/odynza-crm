const express = require("express");
const authenticateToken = require("../middleware/auth");
const {
  signup,
  login,
  me,
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticateToken, me);

module.exports = router;
