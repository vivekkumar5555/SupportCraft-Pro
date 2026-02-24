/**
 * PDF-Grounded Chat Service with Smart Fallbacks
 * This generates PDF-based responses with intelligent default fallbacks
 */

import defaultAnswers, {
  getDefaultAnswer,
  detectMessageType,
} from "../config/defaultAnswers.js";

/**
 * Generate a PDF-grounded chat response with smart fallbacks
 * @param {string} userMessage - The user's message
 * @param {string} context - The context from similar documents
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - The generated response with source indicator
 */
export const generateChatResponse = async (
  userMessage,
  context,
  options = {}
) => {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const userMessageLower = userMessage.toLowerCase();

    console.log(`[PDF-CHAT] Processing query: "${userMessage}"`);
    console.log(
      `[PDF-CHAT] Context length: ${context ? context.length : 0} characters`
    );

    // Step 1: Check message type for later fallback
    const messageType = detectMessageType(userMessage);

    // Only use default responses for pure conversational messages (not content questions)
    const isPureConversational = ["greeting", "thanks", "goodbye"].includes(
      messageType
    );

    console.log(`[PDF-CHAT] Detected message type: ${messageType}`);

    // Step 2: If it's pure conversational (hello, thanks, bye), use default response
    if (isPureConversational && (!context || context.trim().length === 0)) {
      const defaultResponse = getDefaultAnswer(messageType);
      console.log(`[PDF-CHAT] Using default response for ${messageType}`);

      return {
        message: defaultResponse,
        confidence: 0.8,
        source: "default",
        messageType: messageType,
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70,
        },
        model: "pdf-default-response",
        timestamp: new Date().toISOString(),
      };
    }

    // Step 3: If we have context, analyze it for relevant information
    if (context && context.trim().length > 0) {
      console.log(`[PDF-CHAT] Analyzing context for relevant information`);

      // Check if this is Q&A format document
      const isQAFormat = /Q\d+:|Question|A\d+:|Answer/i.test(context);
      console.log(`[PDF-CHAT] Detected Q&A format: ${isQAFormat}`);

      // Find relevant sections from the context that match the user's question
      const contextLines = context
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // If Q&A format, try to find matching Q&A pairs first
      let relevantLines = [];
      if (isQAFormat) {
        relevantLines = findRelevantQAPairs(userMessage, context, userMessageLower);
        console.log(`[PDF-CHAT] Q&A pair search returned ${relevantLines.length} results`);
      }

      // If no Q&A pairs matched, fall back to line-based scoring
      if (relevantLines.length === 0) {
        console.log(`[PDF-CHAT] No Q&A pairs matched, falling back to line scoring`);
        relevantLines = scoreAndFilterLines(userMessage, contextLines, userMessageLower);
        console.log(`[PDF-CHAT] Line scoring returned ${relevantLines.length} results`);
      }

      // If still nothing found, try a more lenient search (search entire context for keywords)
      if (relevantLines.length === 0) {
        console.log(`[PDF-CHAT] No results from line scoring, trying lenient keyword search`);
        relevantLines = scoreAndFilterLines(userMessage, [context], userMessageLower);
        if (relevantLines.length === 0 && context.trim().length > 0) {
          // Last resort: return first meaningful chunk of context
          const firstChunk = context.split('\n\n')[0].trim();
          if (firstChunk.length > 20) {
            relevantLines = [firstChunk];
            console.log(`[PDF-CHAT] Using first context chunk as last resort`);
          }
        }
      }

      // Step 4: If we found relevant content, generate response
      if (relevantLines.length > 0) {
        console.log(`[PDF-CHAT] Found ${relevantLines.length} relevant lines`);
        const pdfResponse = generateResponseFromRelevantLines(
          userMessage,
          relevantLines,
          userMessageLower
        );

        if (pdfResponse) {
          // Final safety: enforce max length (500 chars ≈ 2-3 sentences)
          const truncatedResponse = pdfResponse
            .split(/(?<=[.!?])\s+/)
            .slice(0, 3)
            .join(' ')
            .substring(0, 500)
            .trim();
          
          const finalResponse = truncatedResponse.endsWith('.') 
            ? truncatedResponse 
            : truncatedResponse + '.';

          console.log(
            `[PDF-CHAT] ✅ Generated response: ${finalResponse.substring(
              0,
              80
            )}...`
          );

          return {
            message: finalResponse,
            confidence: 0.9,
            source: "pdf",
            messageType: "pdf_content",
            usage: {
              promptTokens: 100,
              completionTokens: 50,
              totalTokens: 150,
            },
            model: "pdf-grounded-response",
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    // Step 5: No relevant content found, return default notFound response
    console.log(
      `[PDF-CHAT] No relevant content found, using notFound response`
    );

    return {
      message: defaultAnswers.notFound,
      confidence: 0.3,
      source: "default",
      messageType: "notFound",
      usage: {
        promptTokens: 30,
        completionTokens: 15,
        totalTokens: 45,
      },
      model: "pdf-notfound-response",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating PDF-grounded chat response:", error);
    throw new Error(
      `Failed to generate PDF-grounded chat response: ${error.message}`
    );
  }
};

/**
 * Find relevant Q&A pairs from context
 */
const findRelevantQAPairs = (userMessage, context, userMessageLower) => {
  // Split into Q&A pairs - more flexible detection
  const pairs = [];
  const lines = context.split('\n');
  let currentPair = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detect start of new Q&A pair - more flexible patterns
    const isNewQAPair = 
      /^[\d]+[\.\)]\s+/.test(trimmedLine) ||  // Numbered: 1. or 1)
      /^Q[\d]+[\:\.\s]/i.test(trimmedLine) ||  // Q1: or Q1.
      /^Question/i.test(trimmedLine) ||  // Question:
      /^A[\d]+[\:\.\s]/i.test(trimmedLine);  // A1: or A1.
    
    if (isNewQAPair && currentPair.trim() && i > 0) {
      pairs.push(currentPair.trim());
      currentPair = line;
    } else {
      currentPair += (currentPair ? '\n' : '') + line;
    }
  }
  
  // Don't forget to add the last pair
  if (currentPair.trim()) {
    pairs.push(currentPair.trim());
  }

  console.log(`[PDF-CHAT] Detected ${pairs.length} Q&A pairs`);

  const scoredPairs = pairs.map((pair) => {
    // Extract question part more flexibly
    let question = '';
    const lines = pair.split('\n');
    
    // Find first line that looks like a question
    for (let line of lines) {
      const trimmed = line.trim();
      if (/^[\d]+[\.\)]\s+(.+)|^Q[\d]+[\:\.\s]+(.+)|^Question[\:\s]+(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^[\d]+[\.\)]\s+(.+)|^Q[\d]+[\:\.\s]+(.+)|^Question[\:\s]+(.+)/i);
        question = match && (match[1] || match[2] || match[3]) ? (match[1] || match[2] || match[3]) : trimmed;
        break;
      }
    }

    let score = 0;
    const questionLower = question.toLowerCase();

    // Extract keywords from user message
    const userKeywords = userMessageLower
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "was", "for", "is", "are", "does"].includes(w));

    console.log(`[PDF-CHAT] Scoring Q&A pair. Question: "${question.substring(0, 50)}..." Keywords: [${userKeywords.join(', ')}]`);

    // Score based on keyword matches (less strict)
    userKeywords.forEach((keyword) => {
      if (questionLower.includes(keyword)) {
        score += 5;
      }
      // Also check pair body for keywords (gives points even if question doesn't match)
      if (pair.toLowerCase().includes(keyword)) {
        score += 2;
      }
    });

    return { pair: pair.trim(), score, question };
  });

  console.log(`[PDF-CHAT] Scored pairs:`, scoredPairs.map(p => ({ question: p.question.substring(0, 40), score: p.score })));

  // Sort by score and return ONLY the top match
  const topMatch = scoredPairs
    .sort((a, b) => b.score - a.score)
    .slice(0, 1);
  
  console.log(`[PDF-CHAT] Top match score: ${topMatch.length > 0 ? topMatch[0].score : 'none'}`);
  
  return topMatch.map((item) => item.pair);
};

/**
 * Score and filter lines by relevance
 */
const scoreAndFilterLines = (userMessage, contextLines, userMessageLower) => {
  // Score each line by relevance
  const scoredLines = contextLines.map((line) => {
    const lineLower = line.toLowerCase();
    let score = 0;

    // Extract key words from user message (remove common words)
    const userWords = userMessageLower
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2) // Only words longer than 2 characters
      .filter(
        (word) =>
          ![
            "the",
            "and",
            "or",
            "but",
            "for",
            "with",
            "this",
            "that",
            "what",
            "how",
            "is",
            "are",
            "was",
            "were",
            "your",
            "our",
            "when",
            "where",
            "which",
            "why",
            "how",
          ].includes(word)
      ); // Remove common words

    // Check for word matches (higher score for exact matches)
    userWords.forEach((word) => {
      if (lineLower.includes(word)) {
        score += 3;
      }
    });

    // Penalize lines that are just questions (start with Q or Question)
    if (/^Q\d+:|^Question|^A\d+:|^Answer/i.test(line)) {
      const isQuestion = /^Q\d+:|^Question/i.test(line);
      const isAnswer = /^A\d+:|^Answer/i.test(line);

      if (isQuestion && userWords.length > 0) {
        // Only score questions if they match user intent
        score += 2;
      } else if (isAnswer) {
        // Score answers higher
        score += 5;
      }
    }

    return { line, score };
  });

  // Filter lines with positive scores and sort by relevance  
  // Also accept lines with score 0 if they're longer and contain some context relevance
  const relevantLines = scoredLines
    .filter((item) => item.score > 0 || (item.line.trim().length > 30 && item.score >= 0))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.line);

  console.log(`[PDF-CHAT] Line scoring found ${relevantLines.length} relevant lines`);
  return relevantLines;
};

/**
 * Generate response from relevant lines
 */
const generateResponseFromRelevantLines = (userMessage, relevantLines, userMessageLower) => {
  if (relevantLines.length === 0) {
    console.log(`[PDF-CHAT] generateResponseFromRelevantLines: No lines provided`);
    return null;
  }

  console.log(`[PDF-CHAT] Generating response from ${relevantLines.length} lines`);
  
  // Get the first relevant line/pair
  const content = relevantLines[0];
  const isQAFormat = /Q\d+:|Question|A\d+:|Answer|\d+\./i.test(content);

  if (isQAFormat) {
    console.log(`[PDF-CHAT] Detected Q&A format`);
    
    // Extract answer - simpler approach: take everything after the first line
    let answer = '';
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length > 1) {
      // assume the first line is the question; rest is answer
      answer = lines.slice(1).join(' ').trim();
    }
    // if naive extraction failed, fall back to previous detailed logic
    if (!answer) {
      let foundQuestion = false;
      const answerLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isQuestionLine =
          /^\d+[\.\)]\s+/.test(line) ||
          /^Q\d+[\:\.\s]/i.test(line) ||
          /^Question[\:\s]/i.test(line) ||
          (line.endsWith('?') && (i === 0 || !foundQuestion));
        if (isQuestionLine) {
          foundQuestion = true;
          continue;
        }
        if (foundQuestion && /^\d+[\.\)]\s+|^Q\d+[\:\.\s]/i.test(line)) {
          break;
        }
        if (foundQuestion && line.length > 0) {
          if (!/^A\d+[\:\.\s]|^Answer[\:\s]|^[A-Z\s]{3,}$|^Computer|^FAQ|^Frequently/i.test(line)) {
            answerLines.push(line);
          }
        }
      }
      answer = answerLines.join(' ').trim();
    }
    
    // Fallback: if pattern extraction didn't work, try regex patterns
    if (!answer) {
      const patterns = [
        /(?:Answer|A\d+)\s*:?\s*([\s\S]*?)(?=\n\s*(?:\d+\.|Q\d+:|Question|A\d+:|Answer|FAQ)|\n\n\n|$)/i,
        /^[#\s]*\d+\.\s*[^\n]+(?:\n|:\s*)([\s\S]*?)(?=(?:\d+\.|Q\d+:|Question|FAQ|\n\n))/i,
      ];

      for (let pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          answer = match[1].trim();
          console.log(`[PDF-CHAT] Matched fallback pattern`);
          break;
        }
      }
    }

    // Clean up the answer
    answer = answer
      .replace(/^(Source|Document|File|From):\s*/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(Source:.*?\)/gi, "")
      .replace(/\{.*?\}/g, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/^Q\d+:\s*/i, "")
      .replace(/^A\d+:\s*/i, "")
      .replace(/^Answer\s*:\s*/i, "")
      .replace(/^Question\s*:\s*/i, "")
      .trim();

    // Stop at next Q/A marker or "Computer" header
    answer = answer.split(/\n\s*(?:\d+\.|Q\d+:|A\d+:|Question|Answer|Computer|FAQ)/i)[0].trim();

    // Extract first 2-3 sentences
    const sentences = answer.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      answer = sentences.slice(0, 3).join(' ');
    }

    const finalAnswer = answer && answer.length > 0 ? (answer.endsWith(".") ? answer : answer + ".") : null;
    console.log(`[PDF-CHAT] Final answer: "${finalAnswer ? finalAnswer.substring(0, 100) : 'empty'}..."`);
    return finalAnswer;
  } else {
    // Non-Q&A format
    console.log(`[PDF-CHAT] Non-Q&A format, extracting first sentences`);
    
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 5)
      .slice(0, 3);

    if (sentences.length > 0) {
      let response = sentences.join(' ').trim();
      response = response
        .replace(/^(Source|Document|File|From):\s*/i, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(Source:.*?\)/gi, "")
        .replace(/\{.*?\}/g, "")
        .trim();
      const finalResponse = response + (response.endsWith(".") ? "" : ".");
      console.log(`[PDF-CHAT] Extracted response: "${finalResponse.substring(0, 100)}..."`);
      return finalResponse;
    }

    const firstSentence = content.split(/(?<=[.!?])\s+/)[0].trim() + ".";
    console.log(`[PDF-CHAT] Single sentence: "${firstSentence.substring(0, 100)}..."`);
    return firstSentence;
  }
};


/**
 * Generate a fallback response when no context is found
 * @param {string} userMessage - The user's message
 * @param {Object} options - Additional options
 * @returns {Object} - The fallback response
 */
export const generateFallbackResponse = (userMessage, options = {}) => {
  const messageType = detectMessageType(userMessage);
  const response = getDefaultAnswer(messageType);

  console.log(`[PDF-CHAT] Generated fallback response for ${messageType}`);

  return {
    message: response,
    confidence: 0.3,
    source: "default",
    messageType: messageType,
    isFallback: true,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Validate and sanitize user input
 * @param {string} input - The user input
 * @returns {Object} - Validation result
 */
export const validateUserInput = (input) => {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      error: "Input must be a non-empty string",
    };
  }

  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return {
      isValid: false,
      error: "Input cannot be empty",
    };
  }

  if (trimmedInput.length > 1000) {
    return {
      isValid: false,
      error: "Input is too long (maximum 1000 characters)",
    };
  }

  // Check for potentially harmful content
  const harmfulPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];

  const hasHarmfulContent = harmfulPatterns.some((pattern) =>
    pattern.test(trimmedInput)
  );

  if (hasHarmfulContent) {
    return {
      isValid: false,
      error: "Input contains potentially harmful content",
    };
  }

  return {
    isValid: true,
    sanitizedInput: trimmedInput,
  };
};

/**
 * Extract key phrases from user message for better context matching
 * @param {string} message - The user message
 * @returns {string[]} - Array of key phrases
 */
export const extractKeyPhrases = (message) => {
  // Simple key phrase extraction
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Remove common stop words
  const stopWords = [
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "up",
    "down",
    "out",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
  ];

  const keyPhrases = words.filter((word) => !stopWords.includes(word));

  return keyPhrases.slice(0, 10); // Limit to 10 key phrases
};

console.log(
  "✅ PDF-GROUNDED CHAT SERVICE LOADED - Using PDF-first approach with smart fallbacks"
);
console.log(
  "   Features: PDF analysis, similarity threshold, source indicators, default responses"
);
