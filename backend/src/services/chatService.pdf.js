/**
 * PDF-Grounded Chat Service
 * Extracts answers from document context using keyword relevance.
 * If context exists, always returns something from it (never falls through to "notFound").
 */

import defaultAnswers, {
  getDefaultAnswer,
  detectMessageType,
} from "../config/defaultAnswers.js";

/**
 * Generate a PDF-grounded chat response
 */
export const generateChatResponse = async (
  userMessage,
  context,
  options = {}
) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const msgLower = userMessage.toLowerCase().trim();

    console.log(`[PDF-CHAT] Processing: "${userMessage}"`);
    console.log(`[PDF-CHAT] Context length: ${context ? context.length : 0}`);

    const messageType = detectMessageType(userMessage);

    // Pure conversational with no context → default greeting/thanks/bye
    if (
      ["greeting", "thanks", "goodbye"].includes(messageType) &&
      (!context || context.trim().length === 0)
    ) {
      return makeResponse(getDefaultAnswer(messageType), 0.8, "default", messageType);
    }

    // No context at all → notFound
    if (!context || context.trim().length === 0) {
      console.log(`[PDF-CHAT] No context available`);
      return makeResponse(defaultAnswers.notFound, 0.3, "default", "notFound");
    }

    // --- We have context, extract the best answer ---

    const userKeywords = extractKeywords(msgLower);
    console.log(`[PDF-CHAT] Keywords: [${userKeywords.join(", ")}]`);

    // Split context into chunks (paragraphs or double-newline separated)
    const chunks = context
      .split(/\n\n+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 10);

    // Score each chunk by keyword overlap
    const scored = chunks.map((chunk) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      for (const kw of userKeywords) {
        if (chunkLower.includes(kw)) score += 3;
      }
      // Bonus for chunks that look like answers
      if (/^(a\d+[\:\.]|answer)/i.test(chunk)) score += 2;
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Pick the best chunk (or first one if nothing scores)
    const best = scored[0];
    const bestChunk = best.score > 0 ? best.chunk : chunks[0];

    // Clean and trim the answer
    let answer = cleanAnswer(bestChunk);

    // Limit to 3 sentences
    const sentences = answer.match(/[^.!?]+[.!?]+/g) || [answer];
    answer = sentences.slice(0, 3).join(" ").trim();
    if (answer.length > 600) answer = answer.substring(0, 597) + "...";
    if (!answer.match(/[.!?]$/)) answer += ".";

    console.log(`[PDF-CHAT] Response: "${answer.substring(0, 80)}..."`);
    return makeResponse(answer, best.score > 0 ? 0.85 : 0.6, "pdf", "pdf_content");
  } catch (error) {
    console.error("Error in PDF chat service:", error);
    throw new Error(`PDF chat service failed: ${error.message}`);
  }
};

function makeResponse(message, confidence, source, messageType) {
  return {
    message,
    confidence,
    source,
    messageType,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model: "pdf-grounded",
    timestamp: new Date().toISOString(),
  };
}

function extractKeywords(text) {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "can", "shall",
    "for", "of", "in", "on", "at", "to", "from", "by", "with", "about",
    "into", "through", "during", "before", "after", "above", "below",
    "up", "down", "out", "off", "over", "under", "again", "further",
    "then", "once", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "if", "it", "its", "my", "your", "our",
    "their", "his", "her", "how", "why", "where", "when", "not", "no",
    "yes", "so", "than", "too", "very", "just", "also", "please", "vs",
  ]);
  return text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function cleanAnswer(text) {
  return text
    .replace(/^(Source|Document|File|From):\s*/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(Source:.*?\)/gi, "")
    .replace(/\{.*?\}/g, "")
    .replace(/^Q\d+[\:\.\s]*/i, "")
    .replace(/^A\d+[\:\.\s]*/i, "")
    .replace(/^(Question|Answer)\s*:\s*/i, "")
    .replace(/^\d+[\.\)]\s*/, "")
    .trim();
}

/**
 * Fallback when no context at all
 */
export const generateFallbackResponse = (userMessage, options = {}) => {
  const messageType = detectMessageType(userMessage);
  return makeResponse(getDefaultAnswer(messageType), 0.3, "default", messageType);
};

export const validateUserInput = (input) => {
  if (!input || typeof input !== "string") {
    return { isValid: false, error: "Input must be a non-empty string" };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) return { isValid: false, error: "Input cannot be empty" };
  if (trimmed.length > 1000) return { isValid: false, error: "Input is too long (max 1000)" };
  if ([/<script/i, /javascript:/i, /on\w+\s*=/i].some((p) => p.test(trimmed))) {
    return { isValid: false, error: "Input contains potentially harmful content" };
  }
  return { isValid: true, sanitizedInput: trimmed };
};

export const extractKeyPhrases = (message) => extractKeywords(message.toLowerCase()).slice(0, 10);

console.log("✅ PDF-GROUNDED CHAT SERVICE LOADED");
