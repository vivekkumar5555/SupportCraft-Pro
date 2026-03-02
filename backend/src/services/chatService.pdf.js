/**
 * PDF-Grounded Chat Service
 * Picks the most relevant document chunk for the user's question
 * and returns a clean answer from it.
 */

import defaultAnswers, {
  getDefaultAnswer,
  detectMessageType,
} from "../config/defaultAnswers.js";

/**
 * Generate a chat response from document chunks.
 * @param {string} userMessage
 * @param {string|string[]} context – single string (legacy) or array of chunk strings
 */
export const generateChatResponse = async (
  userMessage,
  context,
  options = {}
) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const msgLower = userMessage.toLowerCase().trim();
    const messageType = detectMessageType(userMessage);

    console.log(`[PDF-CHAT] Query: "${userMessage}"`);

    // Conversational without context
    if (
      ["greeting", "thanks", "goodbye"].includes(messageType) &&
      (!context || (Array.isArray(context) ? context.length === 0 : context.trim().length === 0))
    ) {
      return makeResponse(getDefaultAnswer(messageType), 0.8, "default", messageType);
    }

    // Normalize context to an array of non-empty chunks
    let chunks;
    if (Array.isArray(context)) {
      chunks = context.filter((c) => c && c.trim().length > 10);
    } else if (context && context.trim().length > 0) {
      chunks = [context.trim()];
    } else {
      chunks = [];
    }

    if (chunks.length === 0) {
      console.log(`[PDF-CHAT] No context available`);
      return makeResponse(defaultAnswers.notFound, 0.3, "default", "notFound");
    }

    console.log(`[PDF-CHAT] Scoring ${chunks.length} chunk(s)`);

    const userKeywords = extractKeywords(msgLower);
    console.log(`[PDF-CHAT] Keywords: [${userKeywords.join(", ")}]`);

    // Score each chunk independently
    const scored = chunks.map((chunk, idx) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      for (const kw of userKeywords) {
        // Exact word boundary match scores higher
        const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "gi");
        const matches = chunkLower.match(re);
        if (matches) {
          score += matches.length * 5;
        } else if (chunkLower.includes(kw)) {
          score += 2;
        }
      }

      console.log(`[PDF-CHAT]   chunk[${idx}] score=${score}  preview="${chunk.substring(0, 60).replace(/\n/g, " ")}..."`);
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    // If no keyword matched at all, still use the top chunk but lower confidence
    const hasMatch = best.score > 0;
    const rawText = best.chunk;

    // Try to extract a focused answer from the chunk
    let answer = extractBestParagraph(rawText, userKeywords);

    // Limit length
    const sentences = answer.match(/[^.!?]+[.!?]+/g) || [answer];
    answer = sentences.slice(0, 4).join(" ").trim();
    if (answer.length > 800) answer = answer.substring(0, 797) + "...";
    if (!answer.match(/[.!?]$/)) answer += ".";

    console.log(`[PDF-CHAT] Answer (${hasMatch ? "matched" : "best-available"}): "${answer.substring(0, 80)}..."`);
    return makeResponse(answer, hasMatch ? 0.85 : 0.5, "pdf", "pdf_content");
  } catch (error) {
    console.error("Error in PDF chat service:", error);
    throw new Error(`PDF chat service failed: ${error.message}`);
  }
};

/**
 * From a chunk of text, find the paragraph most relevant to the keywords.
 */
function extractBestParagraph(text, keywords) {
  // Split into individual Q&A items or paragraphs
  // Try numbered items first (1. xxx  2. xxx)
  const numberedItems = text.split(/(?=\d+\.\s)/).filter((s) => s.trim().length > 15);
  const paragraphs = numberedItems.length > 1
    ? numberedItems
    : text.split(/\n\s*\n/).filter((s) => s.trim().length > 15);

  if (paragraphs.length <= 1) {
    return cleanAnswer(text);
  }

  // Score paragraphs
  let bestPara = paragraphs[0];
  let bestScore = -1;

  for (const para of paragraphs) {
    const paraLower = para.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "gi");
      const m = paraLower.match(re);
      if (m) score += m.length * 5;
      else if (paraLower.includes(kw)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPara = para;
    }
  }

  return cleanAnswer(bestPara);
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
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    "yes", "so", "than", "too", "very", "just", "also", "please",
  ]);
  return text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

export const generateFallbackResponse = (userMessage) => {
  const messageType = detectMessageType(userMessage);
  return makeResponse(getDefaultAnswer(messageType), 0.3, "default", messageType);
};

export const validateUserInput = (input) => {
  if (!input || typeof input !== "string") return { isValid: false, error: "Input must be a non-empty string" };
  const t = input.trim();
  if (t.length === 0) return { isValid: false, error: "Input cannot be empty" };
  if (t.length > 1000) return { isValid: false, error: "Input is too long (max 1000)" };
  if ([/<script/i, /javascript:/i, /on\w+\s*=/i].some((p) => p.test(t)))
    return { isValid: false, error: "Harmful content" };
  return { isValid: true, sanitizedInput: t };
};

export const extractKeyPhrases = (msg) => extractKeywords(msg.toLowerCase()).slice(0, 10);

console.log("✅ PDF-GROUNDED CHAT SERVICE LOADED");
