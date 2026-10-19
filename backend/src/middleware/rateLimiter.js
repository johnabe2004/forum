// internally keeps track of requests
// handles the counting and timing

import rateLimit from "express-rate-limit";

/*
 * AI Question Draft Coach Rate Limiter
 *
 * Purpose:
 * Prevent users from making excessive AI requests
 * to the Draft Coach endpoint.
 *
 * Configuration:
 * - windowMs: 1 minutes
 * - max: 3 requests per user/IP within that window
 *
 * Example:
 *   Request 1  → allowed
 *   Request 2  → allowed
 *   ...
 *   Request 3 → blocked with HTTP 429
 *
 * The default express-rate-limit store keeps the
 * request count temporarily in the running Node.js
 * server's memory.
 *
 * After the 1-minute rate-limit window expires,
 * the client can make requests again.
 */
const draftCoachLimiter = rateLimit({
  // Length of the rate-limit window: 1 minute.
  windowMs: 60 * 1000,

  // Maximum number of Draft Coach requests allowed
  // from the same client during the window.
  max: 3,

  // Send standard RateLimit headers to the client.
  standardHeaders: true,

  // Do not send the older X-RateLimit-* headers.
  legacyHeaders: false,

  // Response returned when the request limit is exceeded.
  handler: (req, res) => {
    console.log("🚫 Draft Coach rate limit exceeded");

    return res.status(429).json({
      success: false,
      message:
        "You have reached the Draft Coach limit. Please try again later.",
    });
  },
});

export { draftCoachLimiter };
