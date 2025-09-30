import Embedding from "../models/Embedding.js";
import { cosineSimilarity } from "./embeddingService.js";

/**
 * Find similar documents using cosine similarity
 * @param {string} tenantId - The tenant ID
 * @param {number[]} queryEmbedding - The query embedding vector
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of similar documents with similarity scores
 */
export const findSimilarDocuments = async (
  tenantId,
  queryEmbedding,
  options = {}
) => {
  try {
    const {
      limit = 5,
      minSimilarity = 0.7,
      category = null,
      excludeDocumentIds = [],
    } = options;

    // Build filter for MongoDB query
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

    // Get all embeddings for the tenant
    // Note: In production with large datasets, consider using a vector database
    // like Pinecone, Weaviate, or Qdrant for better performance
    const embeddings = await Embedding.find(filter)
      .populate("documentId", "filename originalName metadata")
      .lean(); // Use lean() for better performance

    if (embeddings.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each embedding
    const similarities = embeddings.map((embedding) => {
      try {
        const similarity = cosineSimilarity(
          queryEmbedding,
          embedding.embedding
        );
        return {
          embedding,
          similarity,
        };
      } catch (error) {
        console.error("Error calculating similarity:", error);
        return {
          embedding,
          similarity: 0,
        };
      }
    });

    // Filter by minimum similarity threshold
    const filteredResults = similarities.filter(
      (item) => item.similarity >= minSimilarity
    );

    // Sort by similarity (descending) and limit results
    const sortedResults = filteredResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return sortedResults;
  } catch (error) {
    console.error("Error finding similar documents:", error);
    throw new Error(`Failed to find similar documents: ${error.message}`);
  }
};

/**
 * Find similar documents with advanced filtering
 * @param {string} tenantId - The tenant ID
 * @param {number[]} queryEmbedding - The query embedding vector
 * @param {Object} options - Advanced search options
 * @returns {Promise<Object>} - Search results with metadata
 */
export const findSimilarDocumentsAdvanced = async (
  tenantId,
  queryEmbedding,
  options = {}
) => {
  try {
    const {
      limit = 5,
      minSimilarity = 0.7,
      category = null,
      excludeDocumentIds = [],
      includeMetadata = true,
      groupByDocument = false,
    } = options;

    // Find similar documents
    const results = await findSimilarDocuments(tenantId, queryEmbedding, {
      limit: limit * 2, // Get more results for grouping
      minSimilarity,
      category,
      excludeDocumentIds,
    });

    let processedResults = results;

    // Group by document if requested
    if (groupByDocument) {
      const documentGroups = {};

      results.forEach((result) => {
        const docId = result.embedding.documentId._id.toString();
        if (!documentGroups[docId]) {
          documentGroups[docId] = {
            document: result.embedding.documentId,
            chunks: [],
            maxSimilarity: 0,
          };
        }

        documentGroups[docId].chunks.push({
          text: result.embedding.text,
          similarity: result.similarity,
          chunkIndex: result.embedding.metadata.chunkIndex,
        });

        documentGroups[docId].maxSimilarity = Math.max(
          documentGroups[docId].maxSimilarity,
          result.similarity
        );
      });

      // Convert to array and sort by max similarity
      processedResults = Object.values(documentGroups)
        .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
        .slice(0, limit);
    }

    // Remove metadata if not requested
    if (!includeMetadata) {
      processedResults = processedResults.map((result) => ({
        text: result.embedding ? result.embedding.text : result.chunks[0].text,
        similarity: result.similarity || result.maxSimilarity,
      }));
    }

    return {
      results: processedResults,
      totalFound: results.length,
      searchOptions: options,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in advanced similarity search:", error);
    throw new Error(
      `Failed to perform advanced similarity search: ${error.message}`
    );
  }
};

/**
 * Get embedding statistics for a tenant
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<Object>} - Embedding statistics
 */
export const getEmbeddingStats = async (tenantId) => {
  try {
    const stats = await Embedding.aggregate([
      { $match: { tenantId, isActive: true } },
      {
        $group: {
          _id: null,
          totalEmbeddings: { $sum: 1 },
          avgTokenCount: { $avg: "$metadata.tokenCount" },
          uniqueDocuments: { $addToSet: "$documentId" },
        },
      },
      {
        $project: {
          totalEmbeddings: 1,
          avgTokenCount: { $round: ["$avgTokenCount", 2] },
          uniqueDocumentCount: { $size: "$uniqueDocuments" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalEmbeddings: 0,
        avgTokenCount: 0,
        uniqueDocumentCount: 0,
      }
    );
  } catch (error) {
    console.error("Error getting embedding stats:", error);
    throw new Error(`Failed to get embedding statistics: ${error.message}`);
  }
};

/**
 * Recompute embeddings for a document (useful for updates)
 * @param {string} documentId - The document ID
 * @param {string} newContent - The new content
 * @returns {Promise<Object>} - Recompute results
 */
export const recomputeDocumentEmbeddings = async (documentId, newContent) => {
  try {
    // This would be implemented to:
    // 1. Delete existing embeddings for the document
    // 2. Split new content into chunks
    // 3. Generate new embeddings
    // 4. Save new embeddings

    // For now, return a placeholder
    return {
      message: "Recompute functionality not yet implemented",
      documentId,
      status: "pending",
    };
  } catch (error) {
    console.error("Error recomputing embeddings:", error);
    throw new Error(`Failed to recompute embeddings: ${error.message}`);
  }
};
