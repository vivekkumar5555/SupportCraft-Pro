import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import Document from "../models/Document.js";
import Embedding from "../models/Embedding.js";
import { parseFileContent } from "../utils/fileParser.js";
// TEMPORARY: Using mock service for testing (no OpenAI required)
// To use real OpenAI: change to "../services/embeddingService.js"
import {
  generateEmbeddings,
  generateBatchEmbeddings,
} from "../services/embeddingService.mock.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["text/plain", "text/csv", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only TXT, CSV, and PDF files are allowed."
        )
      );
    }
  },
});

// Get upload status
export const getUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId).populate("tenantId");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const document = await Document.findOne({
      _id: uploadId,
      tenantId: user.tenantId._id,
    });

    if (!document) {
      return res.status(404).json({ error: "Upload not found" });
    }

    const progress = document.getProcessingProgress();

    res.json({
      uploadId: document._id,
      status: document.processingStatus,
      progress,
      message: getStatusMessage(document.processingStatus, progress),
      chunkCount: document.chunkCount,
      embeddingCount: document.embeddingCount,
      error: document.processingError || null,
    });
  } catch (error) {
    console.error("Get upload status error:", error);
    res.status(500).json({ error: "Failed to get upload status" });
  }
};

// Helper function to generate status messages
const getStatusMessage = (status, progress) => {
  switch (status) {
    case "pending":
      return "Upload received, waiting to process...";
    case "processing":
      return `Processing document... ${progress}% complete`;
    case "completed":
      return "Document indexed successfully";
    case "failed":
      return "Processing failed";
    default:
      return "Unknown status";
  }
};

// Upload FAQ documents
export const uploadDocuments = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate("tenantId");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tenant = user.tenantId;

    // Check if tenant can upload more documents
    if (!tenant.canUploadDocument()) {
      return res.status(400).json({
        error: "Document limit reached. Please upgrade your plan.",
      });
    }

    // Use multer middleware
    upload.array("documents", 5)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const results = [];

      for (const file of req.files) {
        try {
          console.log(`UPLOAD_RECEIVED: ${file.originalname} (${tenant._id})`);

          // Parse file content
          const content = await parseFileContent(file.path, file.mimetype);

          // Create document record with initial status
          const document = new Document({
            tenantId: tenant._id,
            filename: file.filename,
            originalName: file.originalname,
            fileType: path.extname(file.originalname).slice(1),
            fileSize: file.size,
            content,
            processingStatus: "pending",
          });

          await document.save();

          // Increment tenant document count
          await tenant.incrementDocumentCount();

          // Process document asynchronously in background
          processDocumentAsync(document._id, tenant._id).catch((error) => {
            console.error(
              `Background processing error for ${document._id}:`,
              error
            );
          });

          results.push({
            uploadId: document._id.toString(),
            filename: file.originalname,
            size: file.size,
            status: "received",
          });
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          results.push({
            filename: file.originalname,
            error: error.message,
            status: "failed",
          });
        } finally {
          // Clean up uploaded file in finally block to ensure it's always deleted
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error(
              `Error deleting temporary file ${file.path}:`,
              unlinkError
            );
          }
        }
      }

      // Return 202 Accepted with uploadIds
      res.status(202).json({
        message: "Files received and queued for processing",
        results,
      });
    });
  } catch (error) {
    console.error("Upload documents error:", error);
    res.status(500).json({ error: "Failed to upload documents" });
  }
};

// Process document asynchronously (create embeddings)
const processDocumentAsync = async (documentId, tenantId) => {
  let document = null;

  try {
    console.log(`UPLOAD_PARSING: Starting processing for ${documentId}`);

    document = await Document.findById(documentId);
    if (!document) {
      console.error(`Document not found: ${documentId}`);
      return;
    }

    // Update status to processing
    document.processingStatus = "processing";
    await document.save();

    // Split content into chunks
    const chunks = splitTextIntoChunks(document.content, 800); // 800 tokens per chunk

    if (chunks.length === 0) {
      throw new Error("No content chunks generated from document");
    }

    document.chunkCount = chunks.length;
    await document.save();

    console.log(
      `UPLOAD_PARSING: ${documentId} - Generated ${chunks.length} chunks`
    );

    // Process embeddings in batches for better performance
    const BATCH_SIZE = 50;
    let processedChunks = 0;

    for (
      let batchIndex = 0;
      batchIndex < chunks.length;
      batchIndex += BATCH_SIZE
    ) {
      const batchChunks = chunks.slice(batchIndex, batchIndex + BATCH_SIZE);

      console.log(
        `EMBEDDING_BATCH: ${documentId} - Processing batch ${
          Math.floor(batchIndex / BATCH_SIZE) + 1
        }/${Math.ceil(chunks.length / BATCH_SIZE)}`
      );

      try {
        // Generate embeddings for batch with retry logic
        const embeddings = await generateBatchEmbeddingsWithRetry(
          batchChunks,
          3
        );

        // Save embeddings to database
        const embeddingDocs = embeddings.map((embedding, idx) => ({
          tenantId,
          documentId,
          text: batchChunks[idx],
          embedding: embedding,
          metadata: {
            chunkIndex: batchIndex + idx,
            tokenCount: batchChunks[idx].split(" ").length,
          },
        }));

        await Embedding.insertMany(embeddingDocs);
        processedChunks += embeddings.length;

        // Update progress
        document.embeddingCount = processedChunks;
        await document.save();

        console.log(
          `EMBEDDING_BATCH: ${documentId} - Completed ${processedChunks}/${
            chunks.length
          } chunks (${Math.round((processedChunks / chunks.length) * 100)}%)`
        );
      } catch (error) {
        console.error(
          `EMBEDDING_BATCH_ERROR: ${documentId} - Batch ${
            Math.floor(batchIndex / BATCH_SIZE) + 1
          } failed:`,
          error.message
        );

        // Try processing individually as fallback
        for (let i = 0; i < batchChunks.length; i++) {
          try {
            const embedding = await generateEmbeddingsWithRetry(
              batchChunks[i],
              3
            );

            const embeddingDoc = new Embedding({
              tenantId,
              documentId,
              text: batchChunks[i],
              embedding: embedding,
              metadata: {
                chunkIndex: batchIndex + i,
                tokenCount: batchChunks[i].split(" ").length,
              },
            });

            await embeddingDoc.save();
            processedChunks++;

            // Update progress
            document.embeddingCount = processedChunks;
            await document.save();
          } catch (chunkError) {
            console.error(
              `EMBEDDING_ERROR: ${documentId} - Chunk ${
                batchIndex + i
              } failed:`,
              chunkError.message
            );
          }
        }
      }

      // Small delay to avoid rate limits
      if (batchIndex + BATCH_SIZE < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Check if we processed at least some chunks
    if (processedChunks === 0) {
      throw new Error("Failed to create any embeddings");
    }

    // Mark as completed
    document.processingStatus = "completed";
    await document.save();

    console.log(
      `UPLOAD_INDEXED: ${documentId} - Successfully indexed with ${processedChunks} embeddings`
    );
  } catch (error) {
    console.error(`UPLOAD_FAILED: ${documentId} - ${error.message}`, error);

    if (document) {
      document.processingStatus = "failed";
      document.processingError = error.message;
      await document.save();
    }

    // Re-throw to be caught by the caller
    throw error;
  }
};

// Helper function to generate embeddings with retry logic
const generateEmbeddingsWithRetry = async (text, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateEmbeddings(text);
    } catch (error) {
      lastError = error;
      console.error(
        `Embedding attempt ${attempt}/${maxRetries} failed:`,
        error.message
      );

      // Wait with exponential backoff before retry
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

// Helper function to generate batch embeddings with retry logic
const generateBatchEmbeddingsWithRetry = async (texts, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateBatchEmbeddings(texts);
    } catch (error) {
      lastError = error;
      console.error(
        `Batch embedding attempt ${attempt}/${maxRetries} failed:`,
        error.message
      );

      // Wait with exponential backoff before retry
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

// Split text into chunks
const splitTextIntoChunks = (text, maxTokens) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    currentChunk.push(word);

    if (currentChunk.length >= maxTokens) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
};

// Get all documents for tenant
export const getDocuments = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate("tenantId");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { page = 1, limit = 10, status, category } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      tenantId: user.tenantId._id,
      isActive: true,
    };

    if (status) {
      filter.processingStatus = status;
    }

    if (category) {
      filter["metadata.category"] = category;
    }

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Failed to get documents" });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId).populate("tenantId");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const document = await Document.findOne({
      _id: documentId,
      tenantId: user.tenantId._id,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Soft delete document
    document.isActive = false;
    await document.save();

    // Decrement tenant document count
    const tenant = await Tenant.findById(document.tenantId);
    if (tenant) {
      await tenant.decrementDocumentCount();
    }

    // Delete associated embeddings
    await Embedding.updateMany(
      { documentId: document._id },
      { isActive: false }
    );

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
};

// Update tenant settings
export const updateTenantSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const { brandSettings, settings } = req.body;

    const user = await User.findById(userId).populate("tenantId");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tenant = user.tenantId;

    // Update brand settings
    if (brandSettings) {
      tenant.brandSettings = {
        ...tenant.brandSettings,
        ...brandSettings,
      };
    }

    // Update general settings
    if (settings) {
      tenant.settings = {
        ...tenant.settings,
        ...settings,
      };
    }

    await tenant.save();

    res.json({
      message: "Settings updated successfully",
      tenant: {
        id: tenant._id,
        brandSettings: tenant.brandSettings,
        settings: tenant.settings,
      },
    });
  } catch (error) {
    console.error("Update tenant settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// Get tenant analytics
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate("tenantId");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tenantId = user.tenantId._id;

    console.log(`[ANALYTICS] Getting analytics for tenant: ${tenantId}`);

    // Get document statistics
    const documentStats = await Document.aggregate([
      { $match: { tenantId: tenantId, isActive: true } },
      {
        $group: {
          _id: "$processingStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log(`[ANALYTICS] Document stats:`, documentStats);

    // Get embedding statistics
    const embeddingCount = await Embedding.countDocuments({
      tenantId: tenantId,
      isActive: true,
    });

    console.log(`[ANALYTICS] Embedding count:`, embeddingCount);

    // Get recent activity
    const recentDocuments = await Document.find({
      tenantId: tenantId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("originalName processingStatus createdAt");

    const response = {
      analytics: {
        documents: documentStats,
        totalEmbeddings: embeddingCount,
        recentDocuments,
      },
    };

    console.log(`[ANALYTICS] Response:`, JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
};

// Update subscription plan
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate("tenantId");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tenant = user.tenantId;
    const { plan } = req.body;

    if (!plan || !["free", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan. Must be 'free', 'pro', or 'enterprise'",
      });
    }

    // Update the plan
    await tenant.updatePlan(plan);

    res.json({
      message: "Subscription plan updated successfully",
      plan: tenant.subscription.plan,
      limits: {
        maxDocuments: tenant.subscription.maxDocuments,
        maxQueriesPerMonth: tenant.subscription.maxQueriesPerMonth,
      },
    });
  } catch (error) {
    console.error("Update subscription plan error:", error);
    res.status(500).json({ error: "Failed to update subscription plan" });
  }
};
