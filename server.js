// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import bodyParser from "body-parser";
import "./config/passport.js"; // must be import, not require
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "siwic_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
// No passport.session() since you are using JWT on future steps

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Siwic Backend running on ${PORT}`));
