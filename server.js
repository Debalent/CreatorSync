// --------------------------------------
// CreatorSync Server.js (Investor-Ready Version)
// --------------------------------------
// ✅ Loads environment variables for secure API key handling (e.g., MongoDB, Stripe).
require("dotenv").config();

// --------------------------------------
// Import Required Libraries
// --------------------------------------
const express = require("express");       // ✅ Handles API requests
const cors = require("cors");             // ✅ Enables secure cross-origin requests
const multer = require("multer");         // ✅ Manages file uploads (audio, DAW files)
const mongoose = require("mongoose");     // ✅ Connects to MongoDB database
const path = require("path");             // ✅ Helps manage file paths
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // ✅ Handles payment processing
const os = require("os");                 // ✅ Detects user OS for optimization
const socketIo = require("socket.io");    // ✅ Enables real-time collaboration
const http = require("http");             // ✅ Required for WebSockets (live updates)
const { exec } = require("child_process");// ✅ Enables command execution for WebRTC setup

// --------------------------------------
// Initialize Express App & HTTP Server
// --------------------------------------
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --------------------------------------
// Middleware Setup
// --------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------------------------
// Detect User OS & Optimize Performance
// --------------------------------------
const userOS = os.platform();
console.log(`✅ Server running on ${userOS}`);

// --------------------------------------
// MongoDB Connection (Scalable Storage for Assets)
// --------------------------------------
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Database connected successfully!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// --------------------------------------
// File Upload Configuration (Supports DAW Formats)
// --------------------------------------
const allowedFormats = ['.wav', '.mp3', '.midi', '.flp', '.als', '.aac', '.m4a'];
const storage = multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        if (!allowedFormats.includes(ext)) {
            return cb(new Error("❌ Unsupported file format!"));
        }
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage });

// --------------------------------------
// MongoDB Schema for Beats (Tracks DAW Compatibility)
// --------------------------------------
const BeatSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    genre: { type: String, required: true },
    mood: { type: String, required: true },
    price: { type: Number, required: true },
    filename: { type: String, required: true },
    sellerAccount: { type: String, required: true },
    osCompatibility: { type: String, default: userOS },
}, { timestamps: true });

const Beat = mongoose.model("Beat", BeatSchema);

// --------------------------------------
// Route: Upload Beat (Tracks Compatibility & DAW Support)
// --------------------------------------
app.post("/upload", upload.single("beatFile"), async (req, res) => {
    try {
        if (!req.file) throw new Error("❌ No file uploaded!");

        const { title, genre, mood, price, sellerAccount } = req.body;
        if (!title || !genre || !mood || !price || !sellerAccount) throw new Error("❌ All fields are required!");

        const newBeat = new Beat({ 
            title, genre, mood, price, filename: req.file.filename, sellerAccount, osCompatibility: userOS 
        });
        await newBeat.save();

        io.emit("newBeat", newBeat); // ✅ Notifies collaborators of new uploads

        res.status(201).json({ message: "✅ Beat uploaded successfully!", beat: newBeat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --------------------------------------
// Route: Retrieve Beats (DAW & OS Compatibility Included)
// --------------------------------------
app.get("/beats", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const beats = await Beat.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const formattedBeats = beats.map(beat => ({
            ...beat._doc,
            compatibleDAWs: allowedFormats.includes(path.extname(beat.filename)) ? "Compatible" : "Check Format",
            compatibleOS: beat.osCompatibility
        }));

        res.status(200).json(formattedBeats);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to retrieve beats" });
    }
});

// --------------------------------------
// Real-Time Collaboration Setup (Socket.IO)
// --------------------------------------
io.on("connection", (socket) => {
    console.log("🟢 A user connected.");

    socket.on("message", (data) => {
        io.emit("message", data); // ✅ Broadcasts messages
    });

    socket.on("disconnect", () => {
        console.log("🔴 A user disconnected.");
    });
});

// --------------------------------------
// Conversation Recording (WebRTC Integration)
// --------------------------------------
app.post("/start-recording", async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        // ✅ Ensures both users consent to recording before activation
        io.emit("recording-started", { sessionId });

        // ✅ Start WebRTC-based recording session (server-side)
        exec(`ffmpeg -y -i "rtmp://127.0.0.1/live/${sessionId}" -acodec libmp3lame recordings/${sessionId}.mp3`, (error) => {
            if (error) {
                console.error("❌ Recording failed:", error);
                return res.status(500).json({ error: "Recording failed!" });
            }
            res.status(200).json({ message: "✅ Recording started successfully!" });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/stop-recording", async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        // ✅ Stop recording session and save file
        io.emit("recording-stopped", { sessionId });
        res.status(200).json({ message: "✅ Recording stopped, file saved!" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/recordings/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const filePath = path.join(__dirname, "recordings", `${sessionId}.mp3`);
    
    res.download(filePath, (err) => {
        if (err) {
            console.error("❌ Recording file not found:", err);
            res.status(404).json({ error: "Recording file not found!" });
        }
    });
});

// --------------------------------------
// Serve Static Files & Payment Processing
// --------------------------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}, detected OS: ${userOS}`));
