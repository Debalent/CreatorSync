require("dotenv").config(); // ✅ Load environment variables for security

const express = require("express");  
const cors = require("cors");  
const multer = require("multer");  
const mongoose = require("mongoose");  
const path = require("path");  
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // ✅ Stripe integration for payments

const app = express();  
app.use(cors());  
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  

// 🚀 Improved MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Database connected successfully!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        setTimeout(connectDB, 5000);  // 🔁 Retry logic
    }
};
connectDB();  

// 🚀 File Upload Configuration
const storage = multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);  
    },
});
const upload = multer({ storage });

// 🚀 Beat Schema (Now Includes Seller Account Info)
const BeatSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    genre: { type: String, required: true },
    mood: { type: String, required: true },
    price: { type: Number, required: true },
    filename: { type: String, required: true },
    sellerAccount: { type: String, required: true }, // ✅ Store seller payment account
}, { timestamps: true });

const Beat = mongoose.model("Beat", BeatSchema);

// 🚀 Upload Beat Handler (Includes Seller Account Info)
app.post("/upload", upload.single("beatFile"), async (req, res) => {
    try {
        if (!req.file) throw new Error("❌ No file uploaded!");
        const { title, genre, mood, price, sellerAccount } = req.body;
        if (!title || !genre || !mood || !price || !sellerAccount) throw new Error("❌ All fields are required!");

        const newBeat = new Beat({ title, genre, mood, price, filename: req.file.filename, sellerAccount });
        await newBeat.save();
        res.status(201).json({ message: "✅ Beat uploaded successfully!", beat: newBeat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🚀 Payment Route (Handles 12.5% Commission Deduction)
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { beatId, price } = req.body;
        const beat = await Beat.findById(beatId);
        if (!beat) throw new Error("❌ Beat not found!");

        const commissionFee = (price * 0.125).toFixed(2); // ✅ Calculate 12.5% fee
        const sellerPayout = (price - commissionFee).toFixed(2);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: beat.title,
                        },
                        unit_amount: Math.round(price * 100), // ✅ Stripe uses cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/success`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
        });

        res.json({ sessionId: session.id, commissionFee, sellerPayout }); // ✅ Return commission details
    } catch (error) {
        console.error("❌ Payment processing failed:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🚀 Retrieve Beats with Pagination
app.get("/beats", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const beats = await Beat.find().sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json(beats);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to retrieve beats" });
    }
});

// 🚀 Serve Uploaded Beat Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));  

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
