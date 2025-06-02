require("dotenv").config(); // ✅ Load environment variables early for security & flexibility

const express = require("express");  // ✅ Import Express framework
const cors = require("cors");  // ✅ Enables Cross-Origin Resource Sharing (CORS)
const multer = require("multer");  // ✅ Handles file uploads efficiently
const mongoose = require("mongoose");  // ✅ Connects to MongoDB
const path = require("path");  // ✅ Provides path utilities

const app = express();  
app.use(cors());  // ✅ Allow frontend access from different origins (cross-domain)
app.use(express.json());  // ✅ Parse incoming JSON data
app.use(express.urlencoded({ extended: true }));  // ✅ Parse incoming URL-encoded data

// 🚀 Improved MongoDB Connection with Retry Logic
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Database connected successfully!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        setTimeout(connectDB, 5000);  // 🔁 Retry connection after 5 seconds instead of exiting
    }
};
connectDB();  // ✅ Establish database connection on startup

// 🚀 Secure File Upload Configuration (Prevent Filename Collisions)
const storage = multer.diskStorage({
    destination: path.join(__dirname, "uploads"),  // ✅ Store files in "uploads" directory
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);  // ✅ Generate a unique filename
    },
});
const upload = multer({ storage });

// 🚀 Improved Beat Schema with Auto Indexing
const BeatSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },  // ✅ Indexed for faster search
    genre: { type: String, required: true },
    mood: { type: String, required: true },
    price: { type: Number, required: true },
    filename: { type: String, required: true },
}, { timestamps: true });

const Beat = mongoose.model("Beat", BeatSchema);

// 🚀 Enhanced File Upload Handler (Stronger Error Handling)
app.post("/upload", upload.single("beatFile"), async (req, res) => {
    try {
        if (!req.file) throw new Error("❌ No file uploaded!");  // ✅ Prevents empty uploads
        const { title, genre, mood, price } = req.body;
        if (!title || !genre || !mood || !price) throw new Error("❌ All fields are required!");

        const newBeat = new Beat({ title, genre, mood, price, filename: req.file.filename });
        await newBeat.save();  // ✅ Save to MongoDB
        res.status(201).json({ message: "✅ Beat uploaded successfully!", beat: newBeat });
    } catch (error) {
        res.status(500).json({ error: error.message });  // ✅ Handles errors gracefully
    }
});

// 🚀 Retrieve Beats with Pagination (Improves Performance)
app.get("/beats", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;  // ✅ Default pagination values
        const beats = await Beat.find().sort({ createdAt: -1 }) // ✅ Sorted by latest first
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json(beats);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to retrieve beats" });
    }
});

// 🚀 Serve Uploaded Beat Files (Static File Hosting)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));  

// 🚀 Graceful Server Startup (Prevent Crashes on Port Issues)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
