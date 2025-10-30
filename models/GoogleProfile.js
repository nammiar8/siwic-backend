// models/GoogleProfile.js
import mongoose from "mongoose";

const GoogleSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, required: true, index: true },
  name: String,
  email: String,
  profile: Object,
  profilePic: String,
  createdAt: { type: Date, default: Date.now },
});

const GoogleProfile = mongoose.model("GoogleProfile", GoogleSchema);
export default GoogleProfile;
