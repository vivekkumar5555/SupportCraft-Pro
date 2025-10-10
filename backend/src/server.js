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

// Middleware
app.use(helmet());

// Clean up FRONTEND_URL (remove trailing slash if present)
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api/chat", rateLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", authenticateToken, adminRoutes);
app.use("/api/chat", chatRoutes);

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

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  // Ensure uploads directory exists
  await ensureUploadsDir();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();

export { io };
