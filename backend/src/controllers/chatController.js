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
      limit: 5,
      minSimilarity: 0.1, // Lower threshold to get more results for analysis
    });

    console.log(`[CHAT] Query: "${message.substring(0, 50)}..."`);
    console.log(`[CHAT] Found ${similarDocs.length} similar documents`);

    // Generate response using PDF-grounded approach
    let response;
    let sources = [];
    let context = "";

    // Check if we have high-quality matches (≥0.5 similarity)
    const highQualityMatches = similarDocs.filter(
      (doc) => doc.similarity >= 0.5
    );

    if (highQualityMatches.length > 0) {
      console.log(
        `[CHAT] Found ${highQualityMatches.length} high-quality matches (≥0.5 similarity)`
      );

      // Use high-quality matches as context for PDF-grounded response
      context = highQualityMatches
        .map((doc) => doc.embedding.text)
        .join("\n\n");
      response = await generateChatResponse(message, context);

      // Extract sources with more details
      sources = highQualityMatches.map((doc) => ({
        text: doc.embedding.text.substring(0, 300) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));

      console.log(
        `[CHAT] Top similarity:`,
        highQualityMatches[0].similarity.toFixed(4)
      );
      console.log(`[CHAT] Context preview:`, context.substring(0, 200) + "...");
    } else {
      console.log(`[CHAT] No high-quality matches found (≥0.5 similarity)`);

      // Use all available matches as context, but response will be default fallback
      if (similarDocs.length > 0) {
        context = similarDocs.map((doc) => doc.embedding.text).join("\n\n");
        console.log(
          `[CHAT] Using ${similarDocs.length} low-quality matches for context analysis`
        );
      }

      response = await generateChatResponse(message, context);

      // Still provide sources for transparency
      sources = similarDocs.slice(0, 3).map((doc) => ({
        text: doc.embedding.text.substring(0, 200) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));
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
      limit: 5,
      minSimilarity: 0.1, // Lower threshold for test mode
    });

    console.log(`[CHAT] Query: "${message.substring(0, 50)}..."`);
    console.log(`[CHAT] Found ${similarDocs.length} similar documents`);

    // Generate response using PDF-grounded approach
    let response;
    let sources = [];
    let context = "";

    // Check if we have high-quality matches (≥0.5 similarity)
    const highQualityMatches = similarDocs.filter(
      (doc) => doc.similarity >= 0.5
    );

    if (highQualityMatches.length > 0) {
      console.log(
        `[CHAT] Found ${highQualityMatches.length} high-quality matches (≥0.5 similarity)`
      );

      // Use high-quality matches as context for PDF-grounded response
      context = highQualityMatches
        .map((doc) => doc.embedding.text)
        .join("\n\n");
      response = await generateChatResponse(message, context);

      // Extract sources with more details
      sources = highQualityMatches.map((doc) => ({
        text: doc.embedding.text.substring(0, 300) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));

      console.log(
        `[CHAT] Top similarity:`,
        highQualityMatches[0].similarity.toFixed(4)
      );
      console.log(`[CHAT] Context preview:`, context.substring(0, 200) + "...");
    } else {
      console.log(`[CHAT] No high-quality matches found (≥0.5 similarity)`);

      // Use all available matches as context, but response will be default fallback
      if (similarDocs.length > 0) {
        context = similarDocs.map((doc) => doc.embedding.text).join("\n\n");
        console.log(
          `[CHAT] Using ${similarDocs.length} low-quality matches for context analysis`
        );
      }

      response = await generateChatResponse(message, context);

      // Still provide sources for transparency
      sources = similarDocs.slice(0, 3).map((doc) => ({
        text: doc.embedding.text.substring(0, 200) + "...",
        similarity: Math.round(doc.similarity * 100) / 100,
        documentId: doc.embedding.documentId,
        chunkIndex: doc.embedding.metadata.chunkIndex,
      }));
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
