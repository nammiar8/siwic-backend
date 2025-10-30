// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  email: { type: String, index: true, sparse: true },
  gender: String,
  dateOfBirth: Date,
  homeTown: String,
  profession: String,
  name: String,
  mobile: { type: String, index: true, sparse: true },
  proofDocument: String,
  proofDocumentNumber: String,
  facebookProfileId: String,
  facebookPages: [String],
  instaProfileId: String,
  twitterProfileId: String,
  googleProfileId: String,
  youtubeProfileId: String,
  youtubeChannels: [String],
  whatsappProfileId: String,
  whatsappChannels: [String],
  createdAt: { type: Date, default: Date.now },
});

// helpers
UserSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
  return this.passwordHash;
};

UserSchema.methods.validatePassword = async function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

const User = mongoose.model("Userdbase", UserSchema);
export default User;
