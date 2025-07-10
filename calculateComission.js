// --------------------------------------
// CreatorSync – calculateCommission.js (v2.0.0)
// --------------------------------------
// Calculates subscription pricing with commission, taxes, and discounts
// Investor-facing sidenotes (❖) highlight business value for seed funding
// --------------------------------------

// Load environment variables for secure configuration
// ❖ Protects sensitive data (e.g., tax rates, discounts), ensuring compliance
require("dotenv").config();

// Import dependencies
const Joi = require("joi");
const winston = require("winston");

// Configure Winston logging for analytics
// ❖ Structured logging provides insights into pricing trends, boosting investor confidence
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/pricing.log" }),
    new winston.transports.Console(),
  ],
});

// Subscription plans configuration
// ❖ Centralized config allows easy updates without code changes, reducing maintenance costs
const subscriptionPlans = {
  bi_weekly: { price: 15, duration_days: 14 },
  monthly: { price: 30, duration_days: 30 },
  quarterly: { price: 80, duration_days: 90 },
  semi_annually: { price: 150, duration_days: 180 },
  annually: { price: 280, duration_days: 365 },
  bi_annually: { price: 500, duration_days: 730 },
};

// Environment-based tax and discount rates
// ❖ Configurable rates support global markets and promotional campaigns
const TAX_RATE = parseFloat(process.env.TAX_RATE || 0.1); // Default 10% tax
const DISCOUNT_RATE = parseFloat(process.env.DISCOUNT_RATE || 0); // Default 0% discount

// Joi schema for input validation
// ❖ Robust validation prevents errors, ensuring reliable pricing calculations
const planSchema = Joi.string().valid(...Object.keys(subscriptionPlans)).required();

/**
 * Calculates subscription price with commission, taxes, and discounts
 * @param {string} plan - Subscription plan (e.g., "monthly")
 * @param {Object} [options] - Optional parameters (e.g., currency)
 * @returns {Object|null} Pricing details or null if invalid
 * ❖ Transparent pricing with taxes and discounts enhances user trust and monetization
 */
function calculateSubscriptionPrice(plan, options = {}) {
  // Validate input
  const { error } = planSchema.validate(plan);
  if (error) {
    logger.error(`Invalid plan: ${plan}`, { error: error.message });
    return null;
  }

  const planDetails = subscriptionPlans[plan];
  if (!planDetails) {
    logger.error(`Plan not found: ${plan}`);
    return null;
  }

  try {
    // Base price and commission (12.5%)
    const basePrice = planDetails.price;
    const commissionFee = parseFloat((basePrice * 0.125).toFixed(2));
    
    // Apply discount if available
    const discountAmount = parseFloat((basePrice * DISCOUNT_RATE).toFixed(2));
    const discountedPrice = parseFloat((basePrice - discountAmount).toFixed(2));

    // Apply tax
    const taxAmount = parseFloat((discountedPrice * TAX_RATE).toFixed(2));
    const finalPrice = parseFloat((discountedPrice + taxAmount).toFixed(2));

    // Currency formatting (default USD, extensible for internationalization)
    const currency = options.currency || "USD";
    const formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(finalPrice);

    // Log pricing calculation for analytics
    // ❖ Tracks pricing data to inform monetization strategies
    logger.info("Pricing calculated", {
      plan,
      basePrice,
      commissionFee,
      discountAmount,
      taxAmount,
      finalPrice,
      currency,
    });

    return {
      plan,
      basePrice,
      commissionFee,
      discountAmount,
      taxAmount,
      finalPrice,
      formattedPrice,
      duration_days: planDetails.duration_days,
    };
  } catch (err) {
    logger.error("Pricing calculation failed", { plan, error: err.message });
    return null;
  }
}

// Export for use in other modules
// ❖ Modular design supports integration with server.js and script.js
module.exports = { calculateSubscriptionPrice };
