// --------------------------------------
// CreatorSync – checkout.js (v2.0.0)
// --------------------------------------
// Handles Stripe checkout for beat purchases and subscriptions
// Integrates with calculateCommission.js for consistent pricing
// Investor-facing sidenotes (❖) highlight business value for seed funding
// --------------------------------------

// Load environment variables for secure configuration
// ❖ Protects sensitive data (e.g., Stripe keys, URLs), ensuring compliance
require("dotenv").config();

// Import dependencies
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Joi = require("joi");
const winston = require("winston");
const { calculateSubscriptionPrice } = require("./calculateCommission");
const router = express.Router();

// Configure Winston logging for transaction analytics
// ❖ Tracks checkout activity, providing insights for monetization strategies
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/checkout.log" }),
    new winston.transports.Console(),
  ],
});

// Rate limiting for checkout endpoint
// ❖ Prevents abuse, ensuring fair resource usage and cost efficiency
const rateLimit = require("express-rate-limit");
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 checkout requests per window
  message: "Too many checkout requests, please try again later.",
});

// Input validation schema
// ❖ Robust validation prevents errors and malicious inputs, enhancing reliability
const checkoutSchema = Joi.object({
  beatId: Joi.string().optional(),
  price: Joi.number().positive().optional(),
  subscriptionPlan: Joi.string()
    .valid("bi_weekly", "monthly", "quarterly", "semi_annually", "annually", "bi_annually")
    .optional(),
  currency: Joi.string().default("USD"),
}).xor("beatId", "subscriptionPlan"); // Requires either beatId or subscriptionPlan

// Environment-based configuration
// ❖ Configurable URLs and rates support global markets and flexibility
const CLIENT_URL = process.env.CLIENT_URL || "https://creatorsync.example.com";
const TAX_RATE = parseFloat(process.env.TAX_RATE || 0.1); // Default 10% tax
const DISCOUNT_RATE = parseFloat(process.env.DISCOUNT_RATE || 0); // Default 0% discount

// Validate CLIENT_URL
// ❖ Ensures secure redirects, building user trust
const urlSchema = Joi.string().uri().required();
const { error: urlError } = urlSchema.validate(CLIENT_URL);
if (urlError) {
  logger.error("Invalid CLIENT_URL", { error: urlError.message });
  process.exit(1);
}

// Checkout API - Process beat purchases and subscriptions
// ❖ Secure, scalable checkout drives revenue and user engagement
router.post("/checkout", checkoutLimiter, async (req, res) => {
  // Validate input
  const { error, value } = checkoutSchema.validate(req.body);
  if (error) {
    logger.error("Invalid checkout request", { error: error.message });
    return res.status(400).json({ error: "Invalid request data", details: error.message });
  }

  const { beatId, price, subscriptionPlan, currency } = value;

  try {
    let finalPrice, commissionFee, taxAmount, discountAmount, productName, paymentMode;

    if (subscriptionPlan) {
      // Subscription checkout
      // ❖ Reuses calculateSubscriptionPrice for consistent pricing
      const planDetails = calculateSubscriptionPrice(subscriptionPlan, { currency });
      if (!planDetails) {
        logger.error("Invalid subscription plan", { subscriptionPlan });
        return res.status(400).json({ error: "Invalid subscription plan" });
      }

      finalPrice = planDetails.finalPrice;
      commissionFee = planDetails.commissionFee;
      taxAmount = planDetails.taxAmount;
      discountAmount = planDetails.discountAmount;
      productName = `CreatorSync Subscription (${subscriptionPlan})`;
      paymentMode = "subscription";
    } else {
      // Beat purchase checkout
      // ❖ Consistent commission and tax logic for transparent monetization
      const basePrice = parseFloat(price);
      if (isNaN(basePrice) || basePrice <= 0) {
        logger.error("Invalid price for beat purchase", { beatId, price });
        return res.status(400).json({ error: "Invalid price" });
      }

      const commissionFeeRaw = basePrice * 0.125;
      commissionFee = parseFloat(commissionFeeRaw.toFixed(2));
      const discountedPrice = parseFloat((basePrice - basePrice * DISCOUNT_RATE).toFixed(2));
      taxAmount = parseFloat((discountedPrice * TAX_RATE).toFixed(2));
      finalPrice = parseFloat((discountedPrice + taxAmount).toFixed(2));
      productName = `Beat Purchase (ID: ${beatId})`;
      paymentMode = "payment";
    }

    // Create Stripe checkout session
    // ❖ Secure payment processing maximizes conversion and revenue
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: Math.round(finalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: paymentMode,
      success_url: `${CLIENT_URL}/success?commission=${commissionFee}&finalPrice=${finalPrice}&tax=${taxAmount}&discount=${discountAmount}`,
      cancel_url: `${CLIENT_URL}/cancel`,
      metadata: {
        beatId: beatId || null,
        subscriptionPlan: subscriptionPlan || null,
        commissionFee,
        taxAmount,
        discountAmount,
      }, // ❖ Metadata enables transaction analytics
    });

    // Log successful session creation
    logger.info("Checkout session created", {
      sessionId: session.id,
      productName,
      finalPrice,
      currency,
      paymentMode,
    });

    // Return detailed response
    // ❖ Transparent pricing builds user trust
    res.json({
      sessionId: session.id,
      commissionFee,
      taxAmount,
      discountAmount,
      finalPrice,
      currency,
    });
  } catch (error) {
    logger.error("Checkout error", { error: error.message });
    res.status(500).json({ error: "Failed to process checkout", details: error.message });
  }
});

// Export router for integration with server.js
// ❖ Modular design reduces maintenance costs and supports scalability
module.exports = router;
