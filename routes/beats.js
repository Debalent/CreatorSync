// routes/beats.js
// Sidenote: Modular routes enhance maintainability, reducing development time and costs
const express = require("express");
const path = require("path");
const redis = require("redis");
const { Worker, isMainThread, workerData } = require("worker_threads");
const { exec } = require("child_process");
const router = express.Router();
const Beat = require("../models/Beat");
const upload = require("../middleware/upload"); // Assumes Multer config moved to middleware
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

//---------------------------------------
// Upload Beat
// Sidenote: Secure file uploads with rate limiting drive user engagement and prevent abuse
router.post("/upload", uploadLimiter, upload.single("beatFile"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    const { title, genre, mood, price, sellerAccount } = req.body;
    if (!title || !genre || !mood || !price || !sellerAccount) {
      throw new Error("All fields are required");
    }
    const newBeat = new Beat({
      title,
      genre,
      mood,
      price,
      filename: req.file.filename,
      sellerAccount,
      osCompatibility: require("os").platform(),
    });
    await newBeat.save();
    io.emit("newBeat", newBeat); // Real-time notification
    res.status(201).json({ message: "Beat uploaded", beat: newBeat });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//---------------------------------------
// List Beats (Paginated)
// Sidenote: Efficient data retrieval enhances user experience and reduces server load
router.get("/beats", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const beats = await Beat.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const formatted = beats.map(b => ({
      id: b._id,
      title: b.title,
      genre: b.genre,
      mood: b.mood,
      price: b.price,
      previewUrl: `${req.protocol}://${req.get("host")}/uploads/${b.filename}`,
      os: b.osCompatibility,
      createdAt: b.createdAt,
    }));
    res.json({ page, limit, results: formatted });
  } catch {
    res.status(500).json({ error: "Could not fetch beats" });
  }
});

//---------------------------------------
// Discover (Filter + Pagination + Caching)
// Sidenote: Caching reduces database load, lowering costs and improving response times
router.get("/discover", async (req, res) => {
  try {
    const { genre, mood, sort = "createdAt", order = "desc", search, page = 1, limit = 10 } = req.query;
    const cacheKey = `discover:${JSON.stringify({ genre, mood, sort, order, search, page, limit })}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const filter = {};
    if (genre) filter.genre = genre;
    if (mood) filter.mood = mood;
    if (search) filter.$text = { $search: search };

    const sortOptions = { [sort]: order === "desc" ? -1 : 1 };
    const beats = await Beat.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const results = beats.map(b => ({
      id: b._id,
      title: b.title,
      genre: b.genre,
      mood: b.mood,
      price: b.price,
      previewUrl: `${req.protocol}://${req.get("host")}/uploads/${b.filename}`,
      seller: b.sellerAccount,
      createdAt: b.createdAt,
    }));

    await redisClient.setEx(cacheKey, 300, JSON.stringify({ page, limit, results })); // Cache for 5 minutes
    res.json({ page, limit, results });
  } catch (err) {
    res.status(500).json({ error: "Could not load discovery feed" });
  }
});

//---------------------------------------
// Recording Endpoints (Worker Thread)
// Sidenote: Worker threads prevent blocking, ensuring smooth performance for high concurrency
if (isMainThread) {
  router.post("/recording/start", async (req, res) => {
    const { sessionId } = req.body;
    const worker = new Worker(__filename, { workerData: { sessionId } });
    worker.on("message", () => res.json({ message: "Recording started" }));
    worker.on("error", () => res.status(500).json({ error: "Recording failed" }));
    io.emit("recording-started", { sessionId });
  });
} else {
  exec(
    `ffmpeg -y -i "rtmp://127.0.0.1/live/${workerData.sessionId}" -acodec libmp3lame recordings/${workerData.sessionId}.mp3`,
    err => {
      if (err) parentPort.postMessage({ error: true });
      parentPort.postMessage({ success: true });
    }
  );
}

router.post("/recording/stop", (req, res) => {
  const { sessionId } = req.body;
  io.emit("recording-stopped", { sessionId });
  res.json({ message: "Recording stopped" });
});

router.get("/recording/:sessionId", (req, res) => {
  const file = path.join(__dirname, "recordings", `${req.params.sessionId}.mp3`);
  res.download(file, err => {
    if (err) res.status(404).json({ error: "Not found" });
  });
});

//---------------------------------------
// Audio Preview Streaming
// Sidenote: Streaming reduces bandwidth costs and improves mobile UX
router.get("/preview/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  const stat = require("fs").statSync(filePath);
  const range = req.headers.range;

  if (!range) {
    res.header("Content-Length", stat.size);
    res.header("Content-Type", "audio/mpeg");
    require("fs").createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
  res.header({
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": "audio/mpeg",
  });
  res.status(206);
  require("fs").createReadStream(filePath, { start, end }).pipe(res);
});

module.exports = router;
