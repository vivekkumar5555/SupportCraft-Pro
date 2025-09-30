import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import Document from "../models/Document.js";
import Embedding from "../models/Embedding.js";
import { parseFileContent } from "../utils/fileParser.js";
import { generateEmbeddings } from "../services/embeddingService.js";

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
          // Parse file content
          const content = await parseFileContent(file.path, file.mimetype);

          // Create document record
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

          // Process document asynchronously
          processDocumentAsync(document._id, tenant._id);

          results.push({
            id: document._id,
            filename: file.originalname,
            size: file.size,
            status: "uploaded",
          });

          // Clean up uploaded file
          await fs.unlink(file.path);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          results.push({
            filename: file.originalname,
            error: error.message,
            status: "failed",
          });
        }
      }

      res.json({
        message: "Files uploaded successfully",
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
  try {
    const document = await Document.findById(documentId);
    if (!document) return;

    // Update status to processing
    document.processingStatus = "processing";
    await document.save();

    // Split content into chunks
    const chunks = splitTextIntoChunks(document.content, 800); // 800 tokens per chunk
    document.chunkCount = chunks.length;
    await document.save();

    // Generate embeddings for each chunk
    let processedChunks = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbeddings(chunks[i]);

        const embeddingDoc = new Embedding({
          tenantId,
          documentId,
          text: chunks[i],
          embedding: embedding,
          metadata: {
            chunkIndex: i,
            tokenCount: chunks[i].split(" ").length,
          },
        });

        await embeddingDoc.save();
        processedChunks++;

        // Update progress
        document.embeddingCount = processedChunks;
        await document.save();
      } catch (error) {
        console.error(`Error creating embedding for chunk ${i}:`, error);
      }
    }

    // Mark as completed
    document.processingStatus = "completed";
    await document.save();
  } catch (error) {
    console.error("Process document error:", error);
    const document = await Document.findById(documentId);
    if (document) {
      document.processingStatus = "failed";
      document.processingError = error.message;
      await document.save();
    }
  }
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

    // Get document statistics
    const documentStats = await Document.aggregate([
      { $match: { tenantId, isActive: true } },
      {
        $group: {
          _id: "$processingStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get embedding statistics
    const embeddingCount = await Embedding.countDocuments({
      tenantId,
      isActive: true,
    });

    // Get recent activity
    const recentDocuments = await Document.find({
      tenantId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("originalName processingStatus createdAt");

    res.json({
      analytics: {
        documents: documentStats,
        totalEmbeddings: embeddingCount,
        recentDocuments,
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
};
