// ✅ Load environment variables for security
require("dotenv").config();

const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// ✅ Subscription pricing model from The Finisher
const subscriptionPlans = {
    bi_weekly: { price: 15, duration_days: 14 },
    monthly: { price: 30, duration_days: 30 },
    quarterly: { price: 80, duration_days: 90 },
    semi_annually: { price: 150, duration_days: 180 },
    annually: { price: 280, duration_days: 365 },
    bi_annually: { price: 500, duration_days: 730 }
};

// ✅ Function to calculate commission for beat purchases
const calculateCommission = (price) => {
    const commissionFee = (price * 0.125).toFixed(2); // ✅ 12.5% fee deduction
    const finalPrice = (price * 1.125).toFixed(2); // ✅ Price after fee
    return { commissionFee, finalPrice };
};

// ✅ Function to get subscription pricing
const calculateSubscriptionPrice = (plan) => {
    if (!subscriptionPlans[plan]) return null;
    
    const price = subscriptionPlans[plan].price;
    const commissionFee = (price * 0.125).toFixed(2); // ✅ Keeping consistent fee
    const finalPrice = (price * 1.125).toFixed(2);
    
    return { price, commissionFee, finalPrice };
};

// ✅ Checkout API - Process both beat purchases & subscriptions
router.post("/checkout", async (req, res) => {
    try {
        const { beatId, price, subscriptionPlan } = req.body;
        
        let finalPrice, commissionFee, productName, paymentMode;

        if (subscriptionPlan) {
            const planDetails = calculateSubscriptionPrice(subscriptionPlan);
            if (!planDetails) return res.status(400).json({ error: "Invalid subscription plan" });

            finalPrice = planDetails.finalPrice;
            commissionFee = planDetails.commissionFee;
            productName = `The Finisher Subscription (${subscriptionPlan})`;
            paymentMode = "subscription";
        } else {
            const commissionData = calculateCommission(price);
            finalPrice = commissionData.finalPrice;
            commissionFee = commissionData.commissionFee;
            productName = `Beat Purchase (ID: ${beatId})`;
            paymentMode = "payment";
        }

        // ✅ Create Stripe checkout session with dynamic pricing
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: productName },
                        unit_amount: Math.round(finalPrice * 100), // ✅ Convert to cents for Stripe
                    },
                    quantity: 1,
                },
            ],
            mode: paymentMode,
            success_url: `${process.env.CLIENT_URL}/success?commission=${commissionFee}&finalPrice=${finalPrice}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
        });

        res.json({ sessionId: session.id, commissionFee, finalPrice }); // ✅ Return transaction details

    } catch (error) {
        console.error("❌ Checkout error:", error);
        res.status(500).json({ error: "❌ Failed to process checkout" });
    }
});

// ✅ Export checkout router for integration
module.exports = router;
