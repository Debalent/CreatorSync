```javascript
// CreatorSync – webhook.js (v1.0.0)
// --------------------------------------
// Stripe webhook for handling payment events
// Investor Note: Robust payment handling ensures reliable monetization
// --------------------------------------

const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const winston = require("winston");
const router = express.Router();

// Configure logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/webhook.log" }),
    new winston.transports.Console(),
  ],
});

// Webhook endpoint
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object;
          logger.info("Checkout session completed", {
            sessionId: session.id,
            beatId: session.metadata.beatId,
            subscriptionPlan: session.metadata.subscriptionPlan,
            finalPrice: session.metadata.finalPrice,
          });
          // Update database (e.g., mark beat as purchased or activate subscription)
          break;
        default:
          logger.info("Unhandled webhook event", { type: event.type });
      }
      res.json({ received: true });
    } catch (err) {
      logger.error("Webhook error", { error: err.message });
      res.status(400).json({ error: err.message });
    }
  }
);
// ❖ Handles payment events for reliable transaction processing

module.exports = router;
```
