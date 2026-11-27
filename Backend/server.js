require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const User = require("./models/User");
const { filter } = require("./utils/bloomFilter");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", userRoutes);

const start = async () => {
  await connectDB();

  // Rebuild the Bloom filter from existing usernames
  const users = await User.find({}, "username").lean();
  users.forEach((u) => filter.add(u.username));
  console.log(`Bloom filter loaded ${users.length} usernames (m=${filter.m} bits, k=${filter.k})`);

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
};

start().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
