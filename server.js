// server.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import "./config/passport.js";

dotenv.config();
const app = express();

// ------------------------------
// Middleware
// ------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚡ CORS
app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://localhost:3000"], // allow both local and live frontend
    credentials: true,
  })
);

// ⚡ Express session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "siwic_secret_key",
    resave: false,
    saveUninitialized: true, // ✅ important to fix req.session.regenerate error
cookie: {
  secure: process.env.NODE_ENV === "production", // true when using HTTPS (enable later)
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
},
  })
);

// ⚡ Passport
app.use(passport.initialize());
app.use(passport.session());

// ------------------------------
// MongoDB Connection
// ------------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// Routes
// ------------------------------
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Siwic Backend!");
});

// ------------------------------
// Start Server
// ------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
