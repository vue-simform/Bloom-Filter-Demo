const User = require("../models/User");
const { filter, stats } = require("../utils/bloomFilter");

// GET /api/check/:username
exports.checkUsername = async (req, res) => {
  try {
    const username = req.params.username.trim().toLowerCase();
    if (!username) return res.status(400).json({ message: "Username is required" });

    stats.totalChecks++;
    const bloom = filter.inspect(username);

    // Some bit is 0 -> definitely not taken, skip the database
    if (!filter.has(username)) {
      stats.dbHitsSaved++;
      return res.json({ username, available: true, source: "bloom", falsePositive: false, bloom });
    }

    // All bits are 1 -> "maybe taken", confirm with the database
    stats.dbHits++;
    const exists = await User.exists({ username });
    if (!exists) stats.falsePositives++;
    res.json({ username, available: !exists, source: "db", falsePositive: !exists, bloom });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stats
exports.getStats = (req, res) => {
  res.json({
    ...stats,
    filterBits: filter.m,
    hashesPerItem: filter.k,
    itemsAdded: filter.count,
    fillPercent: Number((filter.fillRatio() * 100).toFixed(2)),
  });
};
