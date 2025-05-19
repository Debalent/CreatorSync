const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection (MongoDB)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// File Upload Configuration
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// Beat Schema & Model
const BeatSchema = new mongoose.Schema({
    title: String,
    genre: String,
    mood: String,
    price: Number,
    filename: String,
});
const Beat = mongoose.model("Beat", BeatSchema);

// API: Upload a beat
app.post("/upload", upload.single("beatFile"), async (req, res) => {
    const { title, genre, mood, price } = req.body;
    const newBeat = new Beat({ title, genre, mood, price, filename: req.file.filename });
    await newBeat.save();
    res.json({ message: "Beat uploaded successfully!" });
});

// API: Get all beats
app.get("/beats", async (req, res) => {
    const beats = await Beat.find();
    res.json(beats);
});

// Start Server
app.listen(3000, () => console.log("Server running on port 3000"));
