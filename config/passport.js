// config/passport.js
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import axios from "axios";

import FbProfile from "../models/FbProfile.js";
import GoogleProfile from "../models/GoogleProfile.js";
import XProfile from "../models/XProfile.js";
import User from "../models/User.js";

export default function configurePassport(passport) {

  passport.serializeUser((user, done) => {
    const kind =
      user.facebookId ? "fb" :
      user.googleId ? "google" :
      user.twitterId ? "twitter" :
      "user";

    done(null, { id: user._id, kind });
  });

  passport.deserializeUser(async (obj, done) => {
    try {
      const modelMap = {
        user: User,
        fb: FbProfile,
        google: GoogleProfile,
        twitter: XProfile
      };

      const Model = modelMap[obj.kind];
      if (!Model) return done(null, obj);

      const doc = await Model.findById(obj.id).lean().exec();
      return done(null, doc || obj);
    } catch (err) {
      done(err);
    }
  });

  // ------------------ FACEBOOK ------------------
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ["id", "displayName", "emails", "link", "picture.type(large)"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const fbObj = {
            facebookId: profile.id,
            name: profile.displayName,
            profileLink: profile._json?.link ?? `https://facebook.com/${profile.id}`,
            email: profile.emails?.[0]?.value,
            profilePic: profile.photos?.[0]?.value,
            raw: profile._json ?? {},
          };

          const saved = await FbProfile.findOneAndUpdate(
            { facebookId: fbObj.facebookId },
            { $set: fbObj },
            { upsert: true, new: true }
          );

          done(null, saved);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  // ------------------ GOOGLE ------------------
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleObj = {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            profilePic: profile.photos?.[0]?.value,
            profile: profile._json,
          };

          const saved = await GoogleProfile.findOneAndUpdate(
            { googleId: googleObj.googleId },
            { $set: googleObj },
            { upsert: true, new: true }
          );

          done(null, saved);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  // ------------------ TWITTER / X ------------------
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_API_KEY,
        consumerSecret: process.env.TWITTER_API_KEY_SECRET,
        callbackURL: process.env.TWITTER_CALLBACK_URL,
        includeEmail: true,
      },
      async (token, tokenSecret, profile, done) => {
        try {
          const twitterObj = {
            twitterId: profile.id,
            name: profile.displayName ?? profile.username,
            username: profile.username ?? null,
            oauthToken: token,
            oauthTokenSecret: tokenSecret,
            profileRaw: profile._json,
          };

          const saved = await XProfile.findOneAndUpdate(
            { twitterId: twitterObj.twitterId },
            { $set: twitterObj },
            { upsert: true, new: true }
          );

          done(null, saved);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}
