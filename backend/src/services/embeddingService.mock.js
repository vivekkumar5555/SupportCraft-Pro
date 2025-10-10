/**
 * MOCK Embedding Service for Testing (No OpenAI Required)
 * This generates fake embeddings for testing the upload pipeline
 * Replace with real embeddingService.js when you have OpenAI credits
 */

/**
 * Generate mock embeddings for text (1536 dimensions like OpenAI)
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} - Array of 1536 random numbers
 */
export const generateEmbeddings = async (text) => {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text input is required and must be a string");
    }

    const cleanText = text.trim();
    if (cleanText.length === 0) {
      throw new Error("Text cannot be empty");
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate deterministic embeddings based on text content
    // This creates more meaningful similarity scores for testing
    const embedding = generateDeterministicEmbedding(cleanText);

    console.log(
      `[MOCK] Generated embedding for text (${cleanText.length} chars)`
    );
    return embedding;
  } catch (error) {
    console.error("Error generating mock embeddings:", error);
    throw new Error(`Failed to generate mock embeddings: ${error.message}`);
  }
};

/**
 * Generate mock embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts
 * @returns {Promise<number[][]>} - Array of embedding arrays
 */
export const generateBatchEmbeddings = async (texts) => {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Texts input must be a non-empty array");
    }

    const cleanTexts = texts
      .filter((text) => text && typeof text === "string")
      .map((text) => text.trim())
      .filter((text) => text.length > 0);

    if (cleanTexts.length === 0) {
      throw new Error("No valid texts provided");
    }

    // Simulate API delay (faster than real API)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Generate deterministic embeddings for each text
    const embeddings = cleanTexts.map((text) =>
      generateDeterministicEmbedding(text)
    );

    console.log(`[MOCK] Generated ${embeddings.length} batch embeddings`);
    return embeddings;
  } catch (error) {
    console.error("Error generating mock batch embeddings:", error);
    throw new Error(
      `Failed to generate mock batch embeddings: ${error.message}`
    );
  }
};

/**
 * Get the dimension of embeddings from the current model
 * @returns {number} - The embedding dimension
 */
export const getEmbeddingDimension = () => {
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

/**
 * Generate deterministic embeddings based on text content
 * This creates more meaningful similarity scores for testing
 * @param {string} text - The text to generate embeddings for
 * @returns {number[]} - Array of 1536 deterministic numbers
 */
const generateDeterministicEmbedding = (text) => {
  const embedding = new Array(1536).fill(0);
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  // Create a simple hash-based embedding
  words.forEach((word, wordIndex) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
    }

    // Distribute the hash across multiple dimensions
    for (let i = 0; i < 10; i++) {
      const index = Math.abs(hash + i) % 1536;
      embedding[index] += (wordIndex + 1) * 0.1;
    }
  });

  // Normalize the embedding
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / norm;
    }
  }

  return embedding;
};

console.log(
  "⚠️  MOCK EMBEDDING SERVICE LOADED - Using deterministic embeddings for testing"
);
console.log(
  "   Replace embeddingService.mock.js with embeddingService.js when OpenAI is available"
);
