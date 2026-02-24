import Tenant from "../models/Tenant.js";
import Embedding from "../models/Embedding.js";
// TEMPORARY: Using mock services for testing (no OpenAI required)
// To use real OpenAI: change to "../services/embeddingService.js" and "../services/chatService.js"
import { generateEmbeddings } from "../services/embeddingService.mock.js";
import { findSimilarDocuments } from "../services/similarityService.js";
import { generateChatResponse } from "../services/chatService.pdf.js";

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

    // Find similar documents with lower threshold to get more results for analysis
    const similarDocs = await findSimilarDocuments(tenant._id, queryEmbedding, {
      limit: 10,
      // Lower threshold to catch documents with very small cosine similarity due to mock embeddings
      minSimilarity: 0.02, // tuned for the deterministic mock algorithm
    });

    console.log(`[CHAT] Query: "${message.substring(0, 50)}..."`);
    console.log(`[CHAT] Found ${similarDocs.length} similar documents`);

    // Generate response using PDF-grounded approach
    let response;
    let sources = [];
    let context = "";

    // Check if we have matches (even lower threshold since using mock embeddings)
    const qualityMatches = similarDocs.filter(
      (doc) => doc.similarity >= 0.005  // Extremely low threshold for mock service
    );

    if (qualityMatches.length > 0) {
      console.log(
        `[CHAT] Found ${qualityMatches.length} quality matches (≥0.01 similarity)`
      );

      // Use TOP 2-3 matches as context for better coverage
      const topMatches = qualityMatches.slice(0, 3);
      context = topMatches.map((doc) => doc.embedding.text).join("\n\n");
      
      response = await generateChatResponse(message, context);

      // Extract sources with more details
      sources = topMatches.map((doc) => ({
        text: doc.embedding.text.substring(0, 300) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));

      console.log(
        `[CHAT] Top similarity:`,
        topMatches[0].similarity.toFixed(4)
      );
      console.log(`[CHAT] Context length:`, context.length);
    } else if (similarDocs.length > 0) {
      console.log(`[CHAT] No quality matches (≥0.01), using all available results`);

      // Use ALL available documents as context even if low quality
      context = similarDocs.map((doc) => doc.embedding.text).join("\n\n");
      console.log(
        `[CHAT] Using ${similarDocs.length} documents for context analysis (total length: ${context.length})`
      );

      response = await generateChatResponse(message, context);

      // Still provide sources for transparency
      sources = similarDocs.slice(0, 3).map((doc) => ({
        text: doc.embedding.text.substring(0, 200) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));
    } else {
      console.log(`[CHAT] ❌ NO DOCUMENTS FOUND AT ALL`);
      
      response = await generateChatResponse(message, "");
      sources = [];
    }

    // Increment query count
    await tenant.incrementQueryCount();

    res.json({
      response: response.message,
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

    // Find similar documents with lower threshold for test mode
    const similarDocs = await findSimilarDocuments(tenant._id, queryEmbedding, {
      limit: 10,
      minSimilarity: 0.15, // Adjusted threshold for test mode with mock embeddings
    });

    console.log(`[CHAT] Query: "${message.substring(0, 50)}..."`);
    console.log(`[CHAT] Found ${similarDocs.length} similar documents`);

    // Generate response using PDF-grounded approach
    let response;
    let sources = [];
    let context = "";

    // Check if we have quality matches (lower threshold for test mode)
    const qualityMatches = similarDocs.filter(
      (doc) => doc.similarity >= 0.2
    );

    if (qualityMatches.length > 0) {
      console.log(
        `[CHAT] Found ${qualityMatches.length} quality matches (≥0.2 similarity)`
      );

      // Use TOP matches (up to 3) as context
      const topMatches = qualityMatches.slice(0, 3);
      context = topMatches.map((doc) => doc.embedding.text).join("\n\n");
      response = await generateChatResponse(message, context);

      // Extract sources with more details
      sources = topMatches.map((doc) => ({
        text: doc.embedding.text.substring(0, 300) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));

      console.log(`[CHAT] Top similarity:`,
        topMatches[0].similarity.toFixed(4)
      );
      console.log(`[CHAT] Context length:`, context.length);
    } else if (similarDocs.length > 0) {
      console.log(`[CHAT] No quality matches (≥0.2), using all available results`);

      // Use ALL available documents as fallback
      context = similarDocs.map((doc) => doc.embedding.text).join("\n\n");
      console.log(
        `[CHAT] Using ${similarDocs.length} documents for context analysis (total length: ${context.length})`
      );

      response = await generateChatResponse(message, context);

      // Still provide sources for transparency
      sources = similarDocs.slice(0, 3).map((doc) => ({
        text: doc.embedding.text.substring(0, 200) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));
    } else {
      console.log(`[CHAT] ❌ NO DOCUMENTS FOUND`);
      
      response = await generateChatResponse(message, "");
      sources = [];
    }

    res.json({
      response: response.message,
      confidence: response.confidence || 0.8,
      source: response.source || "default",
      messageType: response.messageType || "unknown",
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
