// --------------------------------------
// CreatorSync Server.js (v2.0.0)
// - Modernized backend for music collaboration platform
// - Enhanced with security, scalability, and performance features
// - Investor-friendly comments highlight business value for seed funding
// --------------------------------------

// Load environment variables securely from .env file
// Sidenote: Protects sensitive data (e.g., API keys, DB credentials), ensuring compliance with industry standards
require("dotenv").config();

//---------------------------------------
// Import Core Libraries
//---------------------------------------
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const sanitize = require("express-mongo-sanitize");
const mongoose = require("mongoose");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const socketIo = require("socket.io");
const redis = require("redis");
const winston = require("winston");
const { Worker, isMainThread, workerData } = require("worker_threads");
const fileType = require("file-type");
const multer = require("multer");
const http = require("http");
const { exec } = require("child_process");

//---------------------------------------
// Environment Validation with Joi
// Sidenote: Robust validation ensures reliable startup, reducing downtime and improving user trust
const Joi = require("joi");
const envSchema = Joi.object({
  MONGO_URI: Joi.string().uri().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  REDIS_URL: Joi.string().uri().required(),
  SESSION_SECRET: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  SOCKET_AUTH_TOKEN: Joi.string().required(),
  PORT: Joi.number().default(3000),
}).unknown(true);

const { error } = envSchema.validate(process.env);
if (error) {
  console.error("❌ Invalid environment variables:", error.message);
  process.exit(1);
}

//---------------------------------------
// App + Server + Socket.IO Setup
// Sidenote: Socket.IO enables real-time collaboration, a key differentiator for user engagement
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.FRONTEND_URL }, // Secure real-time connections
});

//---------------------------------------
// Redis Setup for Caching and Sessions
// Sidenote: Redis ensures fast data access and stateless sessions, critical for scaling to millions of users
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on("error", err => console.error("Redis error:", err));
redisClient.connect();

//---------------------------------------
// Winston Logging Setup
// Sidenote: Structured logging enables monitoring and analytics, vital for operational insights and investor confidence
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console(),
  ],
});

//---------------------------------------
// Global Middleware
// Sidenote: Middleware stack enhances security, performance, and API usability
app.use(helmet()); // Adds secure HTTP headers to protect against common attacks
app.use(compression()); // Reduces response size, lowering bandwidth costs
app.use(cors({ origin: process.env.FRONTEND_URL })); // Restricts cross-origin requests for security
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitize()); // Prevents NoSQL injection, ensuring data integrity
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`); // Logs requests for analytics
  next();
});

//---------------------------------------
// Rate Limiting for Uploads
// Sidenote: Prevents abuse, ensuring fair resource usage and cost efficiency
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 uploads per window
  message: "Too many uploads, please try again later.",
});

//---------------------------------------
// MongoDB Connection with Connection Pooling
// Sidenote: Connection pooling supports high traffic, enabling scalability for growing user base
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Limits connections for resource efficiency
    });
    logger.info("✅ MongoDB connected");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err);
    setTimeout(connectDB, 5000); // Auto-retry for robustness
  }
};
connectDB();

//---------------------------------------
// Mongoose Schema & Model
// Sidenote: Indexed fields optimize queries, improving performance for large datasets
const BeatSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  genre: { type: String, required: true, index: true },
  mood: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  filename: { type: String, required: true },
  sellerAccount: { type: String, required: true },
  osCompatibility: { type: String, default: require("os").platform() },
}, { timestamps: true });
BeatSchema.index({ title: "text" }); // Enables full-text search for enhanced UX
const Beat = mongoose.model("Beat", BeatSchema);

//---------------------------------------
// Multer File-Upload Config with Content Validation
// Sidenote: Validates file content, not just extensions, preventing malicious uploads
const allowedFormats = [".wav", ".mp3", ".midi", ".flp", ".als", ".aac", ".m4a"];
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: async (req, file, cb) => {
    try {
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        file.stream.on("data", chunk => chunks.push(chunk));
        file.stream.on("end", () => resolve(Buffer.concat(chunks)));
        file.stream.on("error", reject);
      });
      const type = await fileType.fromBuffer(buffer);
      if (!type || !allowedFormats.includes(`.${type.ext}`)) {
        return cb(new Error("Invalid audio file"));
      }
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${type.ext}`;
      cb(null, uniqueName);
    } catch (err) {
      cb(err);
    }
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

//---------------------------------------
// Static Hosting for Uploads & Recordings
// Sidenote: Serves user-uploaded content efficiently, enhancing user experience
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/recordings", express.static(path.join(__dirname, "recordings")));

//---------------------------------------
// Socket.IO with Authentication
// Sidenote: Secure real-time features drive collaboration, a core value proposition
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token === process.env.SOCKET_AUTH_TOKEN) return next();
  next(new Error("Authentication error"));
});
io.on("connection", socket => {
  logger.info("🟢 Socket connected:", socket.id);
  socket.on("message", data => io.emit("message", data));
  socket.on("disconnect", () => logger.info("🔴 Socket disconnected"));
});

//---------------------------------------
// Health Check Endpoint
// Sidenote: Provides system status for monitoring, critical for enterprise-grade reliability
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: Date.now() });
});

//---------------------------------------
// API Routes (Modularized)
// Sidenote: Modular routes improve maintainability, reducing development costs
app.use("/api/v1", require("./routes/beats"));

//---------------------------------------
// Error Handling Middleware
// Sidenote: Centralized error handling ensures consistent API responses, improving developer experience
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

//---------------------------------------
// Start Server
// Sidenote: Robust server startup supports reliable uptime, critical for user retention
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 CreatorSync running on port ${PORT}`);
});
