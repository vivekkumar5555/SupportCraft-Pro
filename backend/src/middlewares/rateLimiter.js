import rateLimit from "express-rate-limit";

/**
 * Rate limiter for chat endpoints
 * Limits requests per IP address
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * Strict rate limiter for chat queries
 * More restrictive limits for actual chat interactions
 */
export const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 chat requests per minute
  message: {
    error: "Too many chat requests, please slow down.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many chat requests, please slow down.",
      retryAfter: "1 minute",
    });
  },
});

/**
 * Rate limiter for file uploads
 * Prevents abuse of file upload endpoints
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: "Too many file uploads, please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many file uploads, please try again later.",
      retryAfter: "1 hour",
    });
  },
});

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per 15 minutes
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * Rate limiter for API endpoints
 * General rate limiting for API access
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  message: {
    error: "Too many API requests, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many API requests, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * Create a custom rate limiter
 * @param {Object} options - Rate limiter options
 * @returns {Function} - Rate limiter middleware
 */
export const createCustomRateLimiter = (options) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      error: "Rate limit exceeded",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  const limiterOptions = { ...defaultOptions, ...options };

  return rateLimit(limiterOptions);
};

/**
 * Rate limiter for widget endpoints
 * Specific limits for widget API calls
 */
export const widgetRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 widget requests per minute
  message: {
    error: "Widget rate limit exceeded, please try again later.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Widget rate limit exceeded, please try again later.",
      retryAfter: "1 minute",
    });
  },
});
