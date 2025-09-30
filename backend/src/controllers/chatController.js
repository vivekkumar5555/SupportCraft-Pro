import Tenant from "../models/Tenant.js";
import Embedding from "../models/Embedding.js";
import { generateEmbeddings } from "../services/embeddingService.js";
import { findSimilarDocuments } from "../services/similarityService.js";
import { generateChatResponse } from "../services/chatService.js";

// Handle chat query
export const handleChatQuery = async (req, res) => {
  try {
    const { tenantKey, message, sessionId } = req.body;

    if (!tenantKey || !message) {
      return res.status(400).json({
        error: "Missing required fields: tenantKey and message",
      });
    }

    // Find tenant by widget key
    const tenant = await Tenant.findOne({
      widgetKey: tenantKey,
      isActive: true,
    });

    if (!tenant) {
      return res.status(401).json({ error: "Invalid tenant key" });
    }

    // Check if tenant can make more queries
    if (!tenant.canMakeQuery()) {
      return res.status(429).json({
        error: "Query limit reached. Please upgrade your plan.",
      });
    }

    // Generate embedding for user query
    const queryEmbedding = await generateEmbeddings(message);

    // Find similar documents
    const similarDocs = await findSimilarDocuments(tenant._id, queryEmbedding, {
      limit: 5,
      minSimilarity: 0.7,
    });

    // Generate response
    let response;
    let sources = [];

    if (similarDocs.length > 0) {
      // Use similar documents as context
      const context = similarDocs.map((doc) => doc.embedding.text).join("\n\n");
      response = await generateChatResponse(message, context);

      // Extract sources
      sources = similarDocs.map((doc) => ({
        text: doc.embedding.text.substring(0, 200) + "...",
        similarity: doc.similarity,
        documentId: doc.embedding.documentId,
      }));
    } else {
      // Fallback response when no similar documents found
      response = {
        message:
          "I don't have specific information about that. Would you like to contact our support team for assistance?",
        confidence: 0,
        isFallback: true,
      };
    }

    // Increment query count
    await tenant.incrementQueryCount();

    res.json({
      response: response.message,
      confidence: response.confidence || 0.8,
      sources,
      isFallback: response.isFallback || false,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat query error:", error);
    res.status(500).json({
      error: "Failed to process query",
      message:
        "I'm having trouble processing your request. Please try again later.",
    });
  }
};

// Test chat query (for admin panel)
export const testChatQuery = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    // Get user's tenant
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId).populate("tenantId");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tenant = user.tenantId;

    // Generate embedding for user query
    const queryEmbedding = await generateEmbeddings(message);

    // Find similar documents
    const similarDocs = await findSimilarDocuments(tenant._id, queryEmbedding, {
      limit: 5,
      minSimilarity: 0.7,
    });

    // Generate response
    let response;
    let sources = [];

    if (similarDocs.length > 0) {
      // Use similar documents as context
      const context = similarDocs.map((doc) => doc.embedding.text).join("\n\n");
      response = await generateChatResponse(message, context);

      // Extract sources with more details
      sources = similarDocs.map((doc) => ({
        text: doc.embedding.text.substring(0, 300) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));
    } else {
      // Fallback response
      response = {
        message:
          "I don't have specific information about that in the uploaded documents. You might want to add more relevant content to improve responses.",
        confidence: 0,
        isFallback: true,
      };
    }

    res.json({
      response: response.message,
      confidence: response.confidence || 0.8,
      sources,
      isFallback: response.isFallback || false,
      query: message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test chat query error:", error);
    res.status(500).json({
      error: "Failed to process test query",
      message:
        "I'm having trouble processing your request. Please try again later.",
    });
  }
};

// Get chat history (if needed for future features)
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tenantKey } = req.query;

    // Find tenant
    const tenant = await Tenant.findOne({
      widgetKey: tenantKey,
      isActive: true,
    });

    if (!tenant) {
      return res.status(401).json({ error: "Invalid tenant key" });
    }

    // For now, return empty history
    // In a full implementation, you'd store chat sessions in a separate collection
    res.json({
      sessionId,
      messages: [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({ error: "Failed to get chat history" });
  }
};

// Validate tenant key
export const validateTenantKey = async (req, res) => {
  try {
    const { tenantKey } = req.params;

    const tenant = await Tenant.findOne({
      widgetKey: tenantKey,
      isActive: true,
    }).select("name brandSettings settings");

    if (!tenant) {
      return res.status(404).json({ error: "Invalid tenant key" });
    }

    res.json({
      valid: true,
      tenant: {
        name: tenant.name,
        brandSettings: tenant.brandSettings,
        settings: tenant.settings,
      },
    });
  } catch (error) {
    console.error("Validate tenant key error:", error);
    res.status(500).json({ error: "Failed to validate tenant key" });
  }
};
