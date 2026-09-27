const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

async function signup(req, res) {
  try {
    const { full_name, email, password, role_id } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: "Full name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    let selectedRoleId = role_id;

    if (!selectedRoleId) {
      const salesRole = await pool.query(
        "SELECT id FROM roles WHERE name = 'sales' LIMIT 1"
      );

      if (!salesRole.rows.length) {
        return res.status(500).json({
          message: "Default sales role is not configured",
        });
      }

      selectedRoleId = salesRole.rows[0].id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users
        (full_name, email, password_hash, role_id)
      VALUES
        ($1, $2, $3, $4)
      RETURNING id, full_name, email, role_id, is_active, created_at
      `,
      [full_name.trim(), normalizedEmail, passwordHash, selectedRoleId]
    );

    const userResult = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role_id,
        r.name AS role,
        u.is_active,
        u.created_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      `,
      [result.rows[0].id]
    );

    const user = userResult.rows[0];

    return res.status(201).json({
      message: "Account created successfully",
      token: createToken(user),
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Unable to create account",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.password_hash,
        u.role_id,
        u.is_active,
        r.name AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
      `,
      [normalizedEmail]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "This account is inactive",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      role: user.role,
      is_active: user.is_active,
    };

    return res.json({
      message: "Login successful",
      token: createToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to sign in",
    });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role_id,
        r.name AS role,
        u.is_active,
        u.created_at,
        u.last_login
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      `,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Me error:", error);

    return res.status(500).json({
      message: "Unable to fetch user",
    });
  }
}

module.exports = {
  signup,
  login,
  me,
};
