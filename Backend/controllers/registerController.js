const User = require("../models/User");
const { filter } = require("../utils/bloomFilter");

// POST /api/register  { username }
exports.registerUser = async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    if (!username) return res.status(400).json({ message: "Username is required" });

    if (await User.exists({ username })) {
      return res.status(409).json({ message: "Username already taken" });
    }

    await User.create({ username });
    filter.add(username);
    res.status(201).json({ message: "Registered successfully", username });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
