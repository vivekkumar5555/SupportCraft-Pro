import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findById(decoded.userId).populate("tenantId");

    if (!user) {
      return res.status(401).json({ error: "Invalid token - user not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    if (!user.tenantId || !user.tenantId.isActive) {
      return res.status(401).json({ error: "Tenant account is deactivated" });
    }

    // Attach user to request
    req.userId = user._id;
    req.user = user;
    req.tenant = user.tenantId;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    return res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

/**
 * Middleware to validate tenant access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateTenantAccess = (req, res, next) => {
  if (!req.tenant) {
    return res.status(401).json({ error: "Tenant access required" });
  }

  // Check if tenant is active
  if (!req.tenant.isActive) {
    return res.status(403).json({ error: "Tenant account is deactivated" });
  }

  // Check subscription status
  if (req.tenant.subscription.plan === "free") {
    const now = new Date();
    if (now > req.tenant.subscription.resetDate) {
      // Reset query count if reset date has passed
      req.tenant.subscription.currentQueries = 0;
      req.tenant.subscription.resetDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      req.tenant.save();
    }
  }

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findById(decoded.userId).populate("tenantId");

    if (user && user.isActive && user.tenantId && user.tenantId.isActive) {
      req.userId = user._id;
      req.user = user;
      req.tenant = user.tenantId;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Middleware to validate widget key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateWidgetKey = async (req, res, next) => {
  try {
    const { tenantKey } = req.body;

    if (!tenantKey) {
      return res.status(400).json({ error: "Tenant key is required" });
    }

    // Find tenant by widget key
    const tenant = await Tenant.findOne({
      widgetKey: tenantKey,
      isActive: true,
    });

    if (!tenant) {
      return res.status(401).json({ error: "Invalid tenant key" });
    }

    // Attach tenant to request
    req.tenant = tenant;

    next();
  } catch (error) {
    console.error("Widget key validation error:", error);
    return res.status(500).json({ error: "Widget key validation failed" });
  }
};
