// routes/auth.js
import express from "express";
import passport from "passport";
import mongoose from "mongoose";
import axios from "axios";

const router = express.Router();

const POSTBACK_URL = process.env.POSTBACK_URL || "http://localhost:3000/userProfile";
const TWITTER_BEARER = process.env.TWITTER_BEARER_TOKEN;

// models
import FbProfile from "../models/FbProfile.js";
import GoogleProfile from "../models/GoogleProfile.js";
import XProfile from "../models/XProfile.js";

// ---------- FACEBOOK ----------
router.get("/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile", "user_posts"] }));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/auth/facebook/failure" }),
  async (req, res) => {
    try {
      const fb = req.user;
      const payload = {
        id: fb.facebookId,
        name: fb.name,
        profileLink: fb.profileLink,
        email: fb.email,
        numberOfPosts: fb.numberOfPosts,
        profilePic: fb.profilePic,
        source: "facebook",
      };

      axios.post(POSTBACK_URL, payload).catch(() => null);
      return res.json({ ok: true, source: "facebook", profile: payload });
    } catch (err) {
      console.error("facebook callback error:", err);
      return res.status(500).json({ ok: false, error: "facebook_callback_failed" });
    }
  }
);

router.get("/facebook/failure", (req, res) => res.status(400).json({ ok: false, error: "facebook_auth_failed" }));

// ---------- GOOGLE ----------
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/google/failure" }),
  async (req, res) => {
    try {
      const g = req.user;
      const payload = {
        id: g.googleId,
        name: g.name,
        email: g.email,
        profile: g.profile,
        profilePic: g.profilePic,
        source: "google",
      };

      axios.post(POSTBACK_URL, payload).catch(() => null);
      return res.json({ ok: true, source: "google", profile: payload });
    } catch (err) {
      console.error("google callback error:", err);
      return res.status(500).json({ ok: false, error: "google_callback_failed" });
    }
  }
);

router.get("/google/failure", (req, res) => res.status(400).json({ ok: false, error: "google_auth_failed" }));

// ---------- TWITTER / X ----------
// start OAuth 1.0a login
router.get("/twitter", passport.authenticate("twitter"));

// callback - passport-twitter returns profile and oauth token/secret saved earlier
router.get(
  "/twitter/callback",
  passport.authenticate("twitter", { session: false, failureRedirect: "/auth/twitter/failure" }),
  async (req, res) => {
    try {
      const twitterDoc = req.user; // result of Xdbase upsert in passport
      // Try to enrich profile using Bearer token (public metrics & tweet counts)
      // If TWITTER_BEARER exists, we can call Twitter v2 endpoints to fetch public_metrics
      if (process.env.TWITTER_BEARER_TOKEN) {
        try {
          // Get user by id (v2)
          const userResp = await axios.get(
            `https://api.twitter.com/2/users/${encodeURIComponent(twitterDoc.twitterId)}?user.fields=public_metrics,profile_image_url,verified`,
            {
              headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
            }
          );

          if (userResp.data && userResp.data.data) {
            const u = userResp.data.data;
            const update = {
              followers_count: u.public_metrics ? u.public_metrics.followers_count : null,
              tweet_count: u.public_metrics ? u.public_metrics.tweet_count : null,
              listed_count: u.public_metrics ? u.public_metrics.listed_count : null,
              profile_image_url: u.profile_image_url || null,
            };
            // Update saved doc
            await XProfile.findOneAndUpdate({ twitterId: twitterDoc.twitterId }, { $set: update }, { new: true });
          }

          // Optionally fetch recent tweets (public) - last 5 tweets
          try {
            const tweetsResp = await axios.get(
              `https://api.twitter.com/2/users/${encodeURIComponent(twitterDoc.twitterId)}/tweets?max_results=5&tweet.fields=public_metrics,created_at`,
              {
                headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
              }
            );
            // we won't store the full tweets collection in Xdbase, but you can if needed
            // For now include count of fetched tweets as a convenience
            if (tweetsResp.data && Array.isArray(tweetsResp.data.data)) {
              await XProfile.findOneAndUpdate(
                { twitterId: twitterDoc.twitterId },
                { $set: { recent_tweet_count: tweetsResp.data.data.length } },
                { new: true }
              );
            }
          } catch (tErr) {
            // ignore tweet fetch failures
            console.warn("tweet fetch failed (non-fatal):", tErr.message || tErr);
          }
        } catch (e) {
          console.warn("twitter v2 user fetch failed:", e.response ? e.response.data : e.message);
        }
      }

      // Reload saved doc to send back
      const saved = await XProfile.findOne({ twitterId: twitterDoc.twitterId }).lean();

      const payload = {
        id: saved.twitterId,
        name: saved.name,
        username: saved.username,
        followers_count: saved.followers_count,
        tweet_count: saved.tweet_count,
        listed_count: saved.listed_count,
        media_count: saved.media_count,
        recent_tweet_count: saved.recent_tweet_count || 0,
        source: "twitter",
      };

      // best-effort postback to frontend
      axios.post(POSTBACK_URL, payload).catch(() => null);

      return res.json({ ok: true, source: "twitter", profile: payload });
    } catch (err) {
      console.error("twitter callback error:", err);
      return res.status(500).json({ ok: false, error: "twitter_callback_failed" });
    }
  }
);

router.get("/twitter/failure", (req, res) => res.status(400).json({ ok: false, error: "twitter_auth_failed" }));

export default router;
