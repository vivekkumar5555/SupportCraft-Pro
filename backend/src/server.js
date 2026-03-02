// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import net from "net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import routes
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

// Import middleware
import { authenticateToken } from "./middlewares/auth.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";

// Import socket handlers
import { setupSocketHandlers } from "./services/socketService.js";

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.access(uploadsDir);
  } catch (error) {
    // Directory doesn't exist, create it
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log("Created uploads directory");
  }
};

const app = express();
const server = createServer(app);

// Clean up URLs (remove trailing slashes if present)
const widgetOrigin = process.env.WIDGET_ORIGIN === "*" 
  ? true 
  : process.env.WIDGET_ORIGIN?.replace(/\/$/, '');

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: widgetOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Serve widget files from backend/widget-assets (copied there during Render build).
// This works even when Render's Root Directory is "backend" (no sibling ../widget).
// Production (Render): widget files copied to backend/widget-assets during build.
// Local dev: use sibling ../widget if widget-assets not present.
const widgetAssetsDir = path.join(__dirname, "..", "widget-assets");
const widgetDirFallback = path.resolve(process.cwd(), "..", "widget");
let widgetDirResolved;
try {
  await fs.access(path.join(widgetAssetsDir, "loader.js"));
  widgetDirResolved = widgetAssetsDir;
} catch {
  widgetDirResolved = widgetDirFallback;
}
// Allow cross-origin script loading (embed on any site); avoid Helmet's same-origin block
const widgetHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Cross-Origin-Resource-Policy": "cross-origin",
};
app.get("/widget/loader.js", (req, res) => {
  res.set({ ...widgetHeaders, "Content-Type": "application/javascript" });
  res.sendFile(path.join(widgetDirResolved, "loader.js"));
});
app.use(
  "/widget/build",
  express.static(path.join(widgetDirResolved, "build"), {
    setHeaders(res) {
      res.set(widgetHeaders);
    },
  })
);

// Middleware
app.use(helmet());

// Clean up FRONTEND_URL (remove trailing slash if present)
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

// Route-specific CORS — no catch-all so they don't overwrite each other
const adminCors = cors({ origin: frontendUrl, credentials: true });
const widgetCors = cors({ origin: true });

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api/chat", rateLimiter);

// Routes — each with its own CORS policy
app.use("/api/auth", adminCors, authRoutes);
app.use("/api/admin", adminCors, authenticateToken, adminRoutes);
app.use("/api/chat", widgetCors, chatRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Socket.io connection handling
setupSocketHandlers(io);

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const START_PORT = parseInt(process.env.PORT, 10) || 5000;

// helper to find an available port starting from `port`
const findFreePort = (port) => {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // try next port
        resolve(findFreePort(port + 1));
      } else {
        reject(err);
      }
    });
    tester.once('listening', () => {
      tester.close(() => resolve(port));
    });
    tester.listen(port);
  });
};

// Start server
const startServer = async () => {
  // Ensure uploads directory exists
  await ensureUploadsDir();

  const port = await findFreePort(START_PORT);
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();

export { io };
