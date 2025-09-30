import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} - Array of embedding values
 */
export const generateEmbeddings = async (text) => {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text input is required and must be a string");
    }

    // Clean and prepare text
    const cleanText = text.trim().replace(/\s+/g, " ");

    if (cleanText.length === 0) {
      throw new Error("Text cannot be empty");
    }

    // Call OpenAI API
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      encoding_format: "float",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding data received from OpenAI");
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embeddings:", error);

    // Handle specific OpenAI errors
    if (error.code === "insufficient_quota") {
      throw new Error("OpenAI API quota exceeded. Please check your billing.");
    } else if (error.code === "invalid_api_key") {
      throw new Error(
        "Invalid OpenAI API key. Please check your configuration."
      );
    } else if (error.code === "rate_limit_exceeded") {
      throw new Error(
        "OpenAI API rate limit exceeded. Please try again later."
      );
    }

    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @returns {Promise<number[][]>} - Array of embedding arrays
 */
export const generateBatchEmbeddings = async (texts) => {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Texts input must be a non-empty array");
    }

    // Clean texts
    const cleanTexts = texts
      .filter((text) => text && typeof text === "string")
      .map((text) => text.trim().replace(/\s+/g, " "))
      .filter((text) => text.length > 0);

    if (cleanTexts.length === 0) {
      throw new Error("No valid texts provided");
    }

    // OpenAI has a limit on batch size, so we'll process in chunks
    const batchSize = 100; // OpenAI's limit is 2048, but we'll use 100 for safety
    const results = [];

    for (let i = 0; i < cleanTexts.length; i += batchSize) {
      const batch = cleanTexts.slice(i, i + batchSize);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
        encoding_format: "float",
      });

      if (response.data) {
        results.push(...response.data.map((item) => item.embedding));
      }
    }

    return results;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
};

/**
 * Get the dimension of embeddings from the current model
 * @returns {number} - The embedding dimension
 */
export const getEmbeddingDimension = () => {
  // text-embedding-3-small has 1536 dimensions
  return 1536;
};

/**
 * Validate if an embedding array is valid
 * @param {number[]} embedding - The embedding array to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateEmbedding = (embedding) => {
  if (!Array.isArray(embedding)) {
    return false;
  }

  if (embedding.length !== getEmbeddingDimension()) {
    return false;
  }

  return embedding.every((value) => typeof value === "number" && !isNaN(value));
};

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} embedding1 - First embedding
 * @param {number[]} embedding2 - Second embedding
 * @returns {number} - Cosine similarity score (-1 to 1)
 */
export const cosineSimilarity = (embedding1, embedding2) => {
  if (!validateEmbedding(embedding1) || !validateEmbedding(embedding2)) {
    throw new Error("Invalid embeddings provided");
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
};
