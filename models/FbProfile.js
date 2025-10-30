import mongoose from "mongoose";

const FbSchema = new mongoose.Schema({
  facebookId: { type: String, index: true, unique: true },
  name: String,
  profileLink: String,
  email: String,
  numberOfPosts: Number,
  raw: Object,
  createdAt: { type: Date, default: Date.now },
});

const FbProfile = mongoose.model("FbProfile", FbSchema);
export default FbProfile;
