require("dotenv").config(); // Load environment variables early
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 Improved MongoDB Connection Handling
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        console.log("✅ Database connected successfully!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1); // Exit on failure
    }
};
connectDB();

// 🔥 File Upload Configuration (With Better Path Handling)
const storage = multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// 🔥 Improved Beat Schema
const BeatSchema = new mongoose.Schema({
    title: { type: String, required: true },
    genre: { type: String, required: true },
    mood: { type: String, required: true },
    price: { type: Number, required: true },
    filename: { type: String, required: true },
}, { timestamps: true });

const Beat = mongoose.model("Beat", BeatSchema);

// 🔥 Upload a Beat (Added Error Handling)
app.post("/upload", upload.single("beatFile"), async (req, res) => {
    try {
        if (!req.file) throw new Error("No file uploaded!");
        const { title, genre, mood, price } = req.body;
        const newBeat = new Beat({ title, genre, mood, price, filename: req.file.filename });
        await newBeat.save();
        res.status(201).json({ message: "✅ Beat uploaded successfully!", beat: newBeat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔥 Get All Beats (Added Sorting & Error Handling)
app.get("/beats", async (req, res) => {
    try {
        const beats = await Beat.find().sort({ createdAt: -1 }); // Latest beats first
        res
 
