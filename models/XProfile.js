// models/XProfile.js
import mongoose from "mongoose";

const XSchema = new mongoose.Schema({
  twitterId: { type: String, unique: true, required: true, index: true },
  name: String,
  username: String,
  followers_count: Number,
  tweet_count: Number,
  listed_count: Number,
  media_count: Number,
  raw: Object,
  createdAt: { type: Date, default: Date.now },
});

const XProfile = mongoose.model("XProfile", XSchema);
export default XProfile;
