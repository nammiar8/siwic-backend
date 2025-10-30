// routes/user.js
import express from "express";
import mongoose from "mongoose";
import axios from "axios";

const router = express.Router();
const User = mongoose.model("Userdbase");

const POSTBACK_URL = process.env.POSTBACK_URL || "http://localhost:3000/userProfile";

/**
 * Check availability endpoint used by frontend:
 * GET /user/check-user?value=somevalue
 * Returns { exists: true/false }
 */
router.get("/check-user", async (req, res) => {
  try {
    const { value } = req.query;
    if (!value) return res.status(400).json({ error: "value required" });

    const exists = await User.findOne({
      $or: [{ username: value }, { email: value }, { mobile: value }],
    }).lean();

    return res.json({ exists: !!exists });
  } catch (err) {
    console.error("check-user error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

/**
 * Register:
 * POST /user/register
 * Body: JSON with fields (username, password, email, gender, dateOfBirth, homeTown, profession, name, mobile,
 * proofDocument, proofDocumentNumber, facebookProfileId, facebookPages[], instaProfileId, twitterProfileId,
 * googleProfileId, youtubeProfileId, youtubeChannels[], whatsappProfileId, whatsappChannels[])
 */
router.post("/register", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.username && !payload.email && !payload.mobile) {
      return res.status(400).json({ ok: false, error: "provide username or email or mobile" });
    }
    if (!payload.password) return res.status(400).json({ ok: false, error: "password required" });

    // check duplicates
    const dup = await User.findOne({
      $or: [{ username: payload.username }, { email: payload.email }, { mobile: payload.mobile }],
    }).exec();

    if (dup) return res.status(400).json({ ok: false, error: "username/email/mobile already exists" });

    const user = new User({
      username: payload.username,
      email: payload.email,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
      homeTown: payload.homeTown,
      profession: payload.profession,
      name: payload.name,
      mobile: payload.mobile,
      proofDocument: payload.proofDocument,
      proofDocumentNumber: payload.proofDocumentNumber,
      facebookProfileId: payload.facebookProfileId,
      facebookPages: Array.isArray(payload.facebookPages) ? payload.facebookPages : payload.facebookPages ? [payload.facebookPages] : [],
      instaProfileId: payload.instaProfileId,
      twitterProfileId: payload.twitterProfileId,
      googleProfileId: payload.googleProfileId,
      youtubeProfileId: payload.youtubeProfileId,
      youtubeChannels: Array.isArray(payload.youtubeChannels) ? payload.youtubeChannels : payload.youtubeChannels ? [payload.youtubeChannels] : [],
      whatsappProfileId: payload.whatsappProfileId,
      whatsappChannels: Array.isArray(payload.whatsappChannels) ? payload.whatsappChannels : payload.whatsappChannels ? [payload.whatsappChannels] : [],
    });

    await user.setPassword(payload.password);
    await user.save();

    const returnPayload = {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      facebookProfileId: user.facebookProfileId,
      facebookPages: user.facebookPages,
      youtubeChannels: user.youtubeChannels,
      whatsappChannels: user.whatsappChannels,
      source: "user",
    };

    // best-effort post to frontend endpoint
    axios.post(POSTBACK_URL, returnPayload).catch(() => null);

    return res.json({ ok: true, user: returnPayload });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

/**
 * Login:
 * POST /user/login
 * Accepts { identifier, password } where identifier can be username, email or mobile
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ ok: false, error: "identifier and password required" });

    // find by username OR email OR mobile
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }, { mobile: identifier }],
    }).exec();

    if (!user) return res.status(400).json({ ok: false, error: "invalid_credentials" });

    const valid = await user.validatePassword(password);
    if (!valid) return res.status(400).json({ ok: false, error: "invalid_credentials" });

    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      source: "user",
    };

    return res.json({ ok: true, user: payload });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;
