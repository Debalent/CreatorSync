// ✅ Load environment variables for security
require("dotenv").config();

const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// 🚀 Function to calculate total price after 12.5% commission
const calculateCommission = (price) => {
    const commissionFee = (price * 0.125).toFixed(2); // ✅ 12.5% fee deduction
    const finalPrice = (price * 1.125).toFixed(2); // ✅ Price after fee
    return { commissionFee, finalPrice };
};

// 🚀 Checkout API - Process Payment & Redirect
router.post("/checkout", async (req, res) => {
    try {
        const { beatId, price } = req.body;

        // ✅ Calculate final price & commission
        const { commissionFee, finalPrice } = calculateCommission(price);

        // ✅ Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: `Beat Purchase (ID: ${beatId})` },
                        unit_amount: Math.round(finalPrice * 100), // ✅ Convert to cents for Stripe
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/success?commission=${commissionFee}&finalPrice=${finalPrice}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
        });

        res.json({ sessionId: session.id, commissionFee, finalPrice }); // ✅ Return transaction details
    } catch (error) {
        console.error("❌ Checkout error:", error);
        res.status(500).json({ error: "❌ Failed to process checkout" });
    }
});

// 🚀 Export checkout router for integration
module.exports = router;
