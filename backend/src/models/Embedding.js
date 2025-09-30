import mongoose from "mongoose";

const embeddingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      chunkIndex: {
        type: Number,
        required: true,
      },
      startChar: Number,
      endChar: Number,
      tokenCount: Number,
      category: String,
      tags: [String],
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

// Indexes for efficient similarity search
embeddingSchema.index({ tenantId: 1, isActive: 1 });
embeddingSchema.index({ documentId: 1 });
embeddingSchema.index({ tenantId: 1, "metadata.category": 1 });

// Compound index for text search (if needed)
embeddingSchema.index({
  tenantId: 1,
  text: "text",
});

// Method to calculate cosine similarity with another embedding
embeddingSchema.methods.cosineSimilarity = function (otherEmbedding) {
  const a = this.embedding;
  const b = otherEmbedding;

  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

// Static method to find similar embeddings
embeddingSchema.statics.findSimilar = async function (
  tenantId,
  queryEmbedding,
  options = {}
) {
  const {
    limit = 5,
    minSimilarity = 0.7,
    category = null,
    excludeDocumentIds = [],
  } = options;

  // Build filter
  const filter = {
    tenantId,
    isActive: true,
  };

  if (category) {
    filter["metadata.category"] = category;
  }

  if (excludeDocumentIds.length > 0) {
    filter.documentId = { $nin: excludeDocumentIds };
  }

  // Get all embeddings for the tenant (in production, consider using a vector database)
  const embeddings = await this.find(filter).populate(
    "documentId",
    "filename originalName"
  );

  // Calculate similarities
  const similarities = embeddings.map((embedding) => ({
    embedding,
    similarity: embedding.cosineSimilarity({ embedding: queryEmbedding }),
  }));

  // Filter by minimum similarity and sort
  const results = similarities
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
};

// Method to get embedding dimension
embeddingSchema.statics.getEmbeddingDimension = function () {
  // OpenAI text-embedding-3-small has 1536 dimensions
  return 1536;
};

export default mongoose.model("Embedding", embeddingSchema);
