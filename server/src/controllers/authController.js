const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    const error = new Error(`Missing ${key} in environment`);
    error.statusCode = 500;
    throw error;
  }
  return value;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const resolvePhotoUrl = (req, photoUrl) => {
  if (!photoUrl) return "";
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  if (photoUrl.startsWith("/")) {
    return `${req.protocol}://${req.get("host")}${photoUrl}`;
  }
  return photoUrl;
};

const signToken = (id, role) =>
  jwt.sign({ id, role }, requireEnv("JWT_SECRET"), { expiresIn: "7d" });

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: role || "user",
    });
    return res.status(201).json({
      token: signToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: resolvePhotoUrl(req, user.photoUrl),
      },
    });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account disabled. Contact administrator." });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    return res.json({
      token: signToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: resolvePhotoUrl(req, user.photoUrl),
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message });
  }
};

const profile = async (req, res) => {
  return res.json(req.user);
};

module.exports = { register, login, profile };
