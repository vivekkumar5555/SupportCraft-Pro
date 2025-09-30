import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ["txt", "csv", "pdf"],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      title: String,
      description: String,
      tags: [String],
      category: String,
      author: String,
      lastModified: Date,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingError: {
      type: String,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    embeddingCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
documentSchema.index({ tenantId: 1, isActive: 1 });
documentSchema.index({ tenantId: 1, processingStatus: 1 });
documentSchema.index({ tenantId: 1, "metadata.category": 1 });

// Virtual for file size in MB
documentSchema.virtual("fileSizeMB").get(function () {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Method to get processing progress
documentSchema.methods.getProcessingProgress = function () {
  if (this.chunkCount === 0) return 0;
  return Math.round((this.embeddingCount / this.chunkCount) * 100);
};

// Method to check if document is fully processed
documentSchema.methods.isFullyProcessed = function () {
  return (
    this.processingStatus === "completed" &&
    this.chunkCount > 0 &&
    this.embeddingCount === this.chunkCount
  );
};

export default mongoose.model("Document", documentSchema);
