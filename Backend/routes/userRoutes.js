const express = require("express");
const { checkUsername, getStats } = require("../controllers/checkController");
const { registerUser } = require("../controllers/registerController");

const router = express.Router();

router.get("/check/:username", checkUsername);
router.post("/register", registerUser);
router.get("/stats", getStats);

module.exports = router;
