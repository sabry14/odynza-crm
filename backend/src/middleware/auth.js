const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.role_id, r.name AS role,
              ARRAY(SELECT p.name FROM role_permissions rp
                    JOIN permissions p ON p.id = rp.permission_id
                    WHERE rp.role_id = u.role_id ORDER BY p.name) AS permissions
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [claims.id]
    );
    if (!result.rows[0]?.is_active) {
      return res.status(401).json({ message: "Your account is inactive or no longer exists" });
    }
    // Permissions come from the current account, never a UI selector or stale token role.
    req.user = result.rows[0];
    return next();
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) {
      console.error("Authentication lookup failed:", error.message);
      return res.status(503).json({ message: "Unable to verify your account. Please try again." });
    }
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;
