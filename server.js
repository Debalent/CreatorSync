// Load environment variables from the .env file to secure sensitive data such as API keys.
require("dotenv").config(); // ✅ Loads environment variables

// Import required libraries and modules:
const express = require("express");             // ✅ Web framework for creating HTTP servers
const cors = require("cors");                   // ✅ Middleware to enable Cross-Origin Resource Sharing
const multer = require("multer");               // ✅ Library for handling multipart/form-data (file uploads)
const mongoose = require("mongoose");           // ✅ ODM (Object Data Modeling) library for MongoDB
const path = require("path");                   // ✅ Provides utilities for working with file and directory paths
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // ✅ Initializes Stripe with secret key for payment processing

// Create an instance of the express application.
const app = express();

// Setup middleware to parse incoming requests and enable CORS:
app.use(cors());                                // ✅ Enables CORS for all origins (adjust as needed)
app.use(express.json());                        // ✅ Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // ✅ Parses URL-encoded payloads

// -------------------------------
// MongoDB Connection Setup
// -------------------------------
const connectDB = async () => {
    try {
        // Attempt to connect to MongoDB using environment variables for the URI.
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        // Log success message if connected.
        console.log("✅ Database connected successfully!");
    } catch (error) {
        // Log error details if connection fails.
        console.error("❌ MongoDB connection failed:", error);
        // Retry the connection after 5 seconds (implements simple retry logic).
        setTimeout(connectDB, 5000);
    }
};
connectDB(); // Initiate the MongoDB connection.

// -------------------------------
// File Upload Configuration using Multer
// -------------------------------
const storage = multer.diskStorage({
    // Define the destination folder for uploads.
    destination: path.join(__dirname, "uploads"),
    // Define the filename for each uploaded file to ensure uniqueness.
    filename: (req, file, cb) => {
        // Create a unique filename using timestamp and a random string.
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage }); // Create Multer middleware with defined storage.

// -------------------------------
// MongoDB Schema Definition for Beats
// -------------------------------
// Define a schema for a 'Beat' which represents a music asset.
const BeatSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true }, // ✅ Title of the beat; indexed for faster queries.
    genre: { type: String, required: true },              // ✅ Genre (e.g., Hip-Hop, Pop).
    mood: { type: String, required: true },               // ✅ Mood attribute (e.g., energetic, mellow).
    price: { type: Number, required: true },              // ✅ Price for purchasing the beat.
    filename: { type: String, required: true },           // ✅ Filename as stored on the server.
    sellerAccount: { type: String, required: true },      // ✅ Payment account identifier for the seller.
}, { timestamps: true });                                 // ✅ Automatically adds createdAt and updatedAt fields.

const Beat = mongoose.model("Beat", BeatSchema); // Model creation for CRUD operations on beats.

// -------------------------------
// Route: Upload Beat
// -------------------------------
// Handles POST requests to "/upload" to store a new beat along with its metadata and file.
app.post("/upload", upload.single("beatFile"), async (req, res) => {
    try {
        // Verify that a file was uploaded.
        if (!req.file) throw new Error("❌ No file uploaded!");

        // Destructure necessary fields from the request body.
        const { title, genre, mood, price, sellerAccount } = req.body;
        // Validate required fields.
        if (!title || !genre || !mood || !price || !sellerAccount) throw new Error("❌ All fields are required!");

        // Create a new Beat document using the supplied data.
        const newBeat = new Beat({ 
            title, 
            genre, 
            mood, 
            price, 
            filename: req.file.filename, 
            sellerAccount 
        });
        await newBeat.save(); // Save the beat to MongoDB.

        // Respond with success status and the new beat data.
        res.status(201).json({ message: "✅ Beat uploaded successfully!", beat: newBeat });
    } catch (error) {
        // Handle any errors that occur during the upload process.
        res.status(500).json({ error: error.message });
    }
});

// -------------------------------
// Route: Payment Processing with Stripe (Checkout Session)
// -------------------------------
app.post("/create-checkout-session", async (req, res) => {
    try {
        // Extract beatId and price from the request body.
        const { beatId, price } = req.body;
        // Look up the beat in the database.
        const beat = await Beat.findById(beatId);
        if (!beat) throw new Error("❌ Beat not found!");

        // Calculate commission fee (12.5%) and determine seller's payout.
        const commissionFee = (price * 0.125).toFixed(2);
        const sellerPayout = (price - commissionFee).toFixed(2);

        // Create a Stripe Checkout Session for secure payment processing.
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"], // Accept only card payments.
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: beat.title, // Use the beat title as a product identifier.
                        },
                        unit_amount: Math.round(price * 100), // Stripe calculates in cents.
                    },
                    quantity: 1, // Single purchase session.
                },
            ],
            mode: "payment",
            // Redirect URLs after payment is successful or cancelled.
            success_url: `${process.env.CLIENT_URL}/success`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
        });

        // Return session details and commission information to the client.
        res.json({ sessionId: session.id, commissionFee, sellerPayout });
    } catch (error) {
        // Log and send error details if payment processing fails.
        console.error("❌ Payment processing failed:", error);
        res.status(500).json({ error: error.message });
    }
});

// -------------------------------
// Route: Retrieve Beats with Pagination
// -------------------------------
app.get("/beats", async (req, res) => {
    try {
        // Retrieve pagination parameters from the query string (default: page 1, limit 10).
        const { page = 1, limit = 10 } = req.query;
        // Query the database for Beats, sort by creation date descending, and apply pagination.
        const beats = await Beat.find().sort({ createdAt: -1 })
            .skip((page - 1) * limit) // Skip a number of records based on the current page.
            .limit(parseInt(limit));  // Limit the number of records returned.

        // Respond with the paginated list of beats.
        res.status(200).json(beats);
    } catch (error) {
        // Handle errors in retrieving beats.
        res.status(500).json({ error: "❌ Failed to retrieve beats" });
    }
});

// -------------------------------
// Serve Static Files: Uploaded Beats
// -------------------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// This middleware serves static files from the "uploads" directory so they can be accessed via URL.

// -------------------------------
// Start the Express Server
// -------------------------------
const PORT = process.env.PORT || 3000; // Use the port specified in environment variables, default to 3000.
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
// Start listening for incoming HTTP requests and log the active port.
