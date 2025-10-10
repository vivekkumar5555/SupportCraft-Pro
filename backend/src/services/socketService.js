import jwt from "jsonwebtoken";
import Tenant from "../models/Tenant.js";
import { handleChatQuery } from "../controllers/chatController.js";

/**
 * Setup Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 */
export const setupSocketHandlers = (io) => {
  // Namespace for chat functionality
  const chatNamespace = io.of("/ws/chat");

  chatNamespace.use(async (socket, next) => {
    try {
      const { tenantKey } = socket.handshake.query;

      if (!tenantKey) {
        return next(new Error("Tenant key is required"));
      }

      // Validate tenant
      const tenant = await Tenant.findOne({
        widgetKey: tenantKey,
        isActive: true,
      });

      if (!tenant) {
        return next(new Error("Invalid tenant key"));
      }

      // Attach tenant to socket
      socket.tenant = tenant;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  chatNamespace.on("connection", (socket) => {
    console.log(`Client connected to chat namespace: ${socket.id}`);
    console.log(`Tenant: ${socket.tenant.name}`);

    // Send welcome message
    socket.emit("bot:message", {
      message: socket.tenant.brandSettings.welcomeMessage,
      timestamp: new Date().toISOString(),
      type: "welcome",
    });

    // Handle user messages
    socket.on("user:message", async (data) => {
      try {
        const { message, sessionId } = data;

        if (!message || typeof message !== "string") {
          socket.emit("error", { message: "Invalid message format" });
          return;
        }

        // Emit typing indicator
        if (socket.tenant.settings.enableTypingIndicator) {
          socket.emit("bot:typing", { isTyping: true });
        }

        // Simulate typing delay
        const delay = socket.tenant.settings.responseDelay || 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Process the message
        const response = await processSocketMessage(
          socket.tenant,
          message,
          sessionId
        );

        // Stop typing indicator
        if (socket.tenant.settings.enableTypingIndicator) {
          socket.emit("bot:typing", { isTyping: false });
        }

        // Send response
        socket.emit("bot:message", {
          message: response.response,
          timestamp: new Date().toISOString(),
          type: "response",
        });
      } catch (error) {
        console.error("Error handling user message:", error);

        // Stop typing indicator
        socket.emit("bot:typing", { isTyping: false });

        // Send error message
        socket.emit("bot:message", {
          message:
            "I'm having trouble processing your request. Please try again later.",
          timestamp: new Date().toISOString(),
          type: "error",
        });
      }
    });

    // Handle typing indicators from user
    socket.on("user:typing", (data) => {
      // Broadcast to other clients in the same session if needed
      // For now, we'll just acknowledge it
      socket.emit("typing:acknowledged", {
        timestamp: new Date().toISOString(),
      });
    });

    // Handle session management
    socket.on("session:start", (data) => {
      const sessionId = data.sessionId || generateSessionId();
      socket.sessionId = sessionId;
      socket.emit("session:started", { sessionId });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Handle namespace errors
  chatNamespace.on("error", (error) => {
    console.error("Chat namespace error:", error);
  });
};

/**
 * Process a message received via socket
 * @param {Object} tenant - The tenant object
 * @param {string} message - The user message
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} - The processed response
 */
const processSocketMessage = async (tenant, message, sessionId) => {
  try {
    // Create a mock request object for the chat controller
    const mockReq = {
      body: {
        tenantKey: tenant.widgetKey,
        message,
        sessionId,
      },
    };

    // Create a mock response object
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => ({
        json: (data) => {
          responseData = { ...data, statusCode: code };
        },
      }),
    };

    // Call the chat controller
    await handleChatQuery(mockReq, mockRes);

    if (responseData && responseData.statusCode) {
      throw new Error(responseData.error || "Failed to process message");
    }

    return responseData;
  } catch (error) {
    console.error("Error processing socket message:", error);
    throw error;
  }
};

/**
 * Generate a unique session ID
 * @returns {string} - A unique session ID
 */
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Broadcast a message to all connected clients of a tenant
 * @param {Server} io - Socket.io server instance
 * @param {string} tenantKey - The tenant's widget key
 * @param {string} event - The event name
 * @param {Object} data - The data to send
 */
export const broadcastToTenant = (io, tenantKey, event, data) => {
  const chatNamespace = io.of("/ws/chat");

  chatNamespace.clients.forEach((socket) => {
    if (socket.tenant && socket.tenant.widgetKey === tenantKey) {
      socket.emit(event, data);
    }
  });
};

/**
 * Get connected clients count for a tenant
 * @param {Server} io - Socket.io server instance
 * @param {string} tenantKey - The tenant's widget key
 * @returns {number} - Number of connected clients
 */
export const getTenantClientCount = (io, tenantKey) => {
  const chatNamespace = io.of("/ws/chat");
  let count = 0;

  chatNamespace.clients.forEach((socket) => {
    if (socket.tenant && socket.tenant.widgetKey === tenantKey) {
      count++;
    }
  });

  return count;
};
