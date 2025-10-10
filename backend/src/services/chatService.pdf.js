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

      // Find relevant sections from the context that match the user's question
      const contextLines = context
        .split("\n")
        .filter((line) => line.trim().length > 0);

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
              ].includes(word)
          ); // Remove common words

        // Check for word matches (higher score for exact matches)
        userWords.forEach((word) => {
          if (lineLower.includes(word)) {
            score += 3;
          }
        });

        // Create synonym groups for better matching
        const synonymGroups = [
          [
            "product",
            "solution",
            "platform",
            "service",
            "tool",
            "system",
            "offers",
          ],
          ["price", "cost", "billing", "payment", "plan", "subscription"],
          ["feature", "capability", "function", "functionality", "includes"],
          ["contact", "support", "email", "phone", "reach"],
          ["help", "assistance", "guide", "how to"],
        ];

        // Check for synonym matches
        synonymGroups.forEach((group) => {
          const userHasWord = group.some((word) =>
            userMessageLower.includes(word)
          );
          const lineHasWord = group.some((word) => lineLower.includes(word));
          if (userHasWord && lineHasWord) {
            score += 5;
          }
        });

        // Boost score for lines that are main descriptions (for product/service questions)
        if (
          userMessageLower.includes("product") ||
          userMessageLower.includes("service") ||
          userMessageLower.includes("company") ||
          userMessageLower.includes("solution") ||
          userMessageLower.includes("what is") ||
          userMessageLower.includes("tell me about") ||
          userMessageLower.includes("about your")
        ) {
          // High priority for overview/introduction lines
          if (
            lineLower.includes("comprehensive") ||
            lineLower.includes("offers") ||
            lineLower.includes("platform includes") ||
            lineLower.includes("our company offers") ||
            lineLower.includes("ai-powered") ||
            lineLower.includes("solution")
          ) {
            score += 15;
          }
          // Very low priority for technical/procedural/support lines
          if (
            lineLower.includes("step") ||
            lineLower.includes("follow these") ||
            lineLower.includes("common issues") ||
            lineLower.includes("for technical support") ||
            lineLower.includes("contact support") ||
            lineLower.includes("check our documentation") ||
            lineLower.match(/^\d+\./)
          ) {
            score -= 15; // Heavy penalty
          }
        }

        // For support/help questions, boost support-related content
        if (
          userMessageLower.includes("support") ||
          userMessageLower.includes("help") ||
          userMessageLower.includes("contact")
        ) {
          if (
            lineLower.includes("support team") ||
            lineLower.includes("contact") ||
            lineLower.includes("email") ||
            lineLower.includes("available")
          ) {
            score += 10;
          }
        }

        // Boost for pricing questions
        if (
          userMessageLower.includes("price") ||
          userMessageLower.includes("cost") ||
          userMessageLower.includes("plan")
        ) {
          if (lineLower.includes("$") || lineLower.includes("pricing")) {
            score += 10;
          }
        }

        // Boost for feature questions
        if (
          userMessageLower.includes("feature") ||
          userMessageLower.includes("capability")
        ) {
          if (
            lineLower.includes("feature") ||
            lineLower.includes("key") ||
            lineLower.includes("-")
          ) {
            score += 10;
          }
        }

        return { line, score };
      });

      // Filter lines with positive scores and sort by relevance
      const relevantLines = scoredLines
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.line);

      // Step 4: If we found relevant content, generate a concise PDF-based response
      if (relevantLines.length > 0) {
        console.log(`[PDF-CHAT] Found ${relevantLines.length} relevant lines`);

        // Generate a concise, direct answer based on the question type
        let pdfResponse = "";

        // Extract specific information based on question type
        if (
          userMessageLower.includes("what is") ||
          userMessageLower.includes("what does") ||
          userMessageLower.includes("explain") ||
          userMessageLower.includes("product") ||
          userMessageLower.includes("service") ||
          userMessageLower.includes("company") ||
          userMessageLower.includes("solution")
        ) {
          // For "what is" questions, find the main description
          const mainDescription = relevantLines.find((line) => {
            const lower = line.toLowerCase();
            return (
              lower.includes("comprehensive") ||
              lower.includes("platform") ||
              lower.includes("solution") ||
              lower.includes("offers") ||
              lower.includes("includes")
            );
          });

          if (mainDescription) {
            // Extract just the core sentence about the product/service
            const sentences = mainDescription
              .split(/[.!?]+/)
              .filter((s) => s.trim().length > 10);
            // Clean the sentence to remove any metadata or source references
            let cleanSentence = sentences[0].trim();
            cleanSentence = cleanSentence
              .replace(/^(Source|Document|File|From):\s*/i, "")
              .replace(/\[.*?\]/g, "") // Remove [document references]
              .replace(/\(Source:.*?\)/gi, "") // Remove (Source: ...)
              .replace(/\{.*?\}/g, "") // Remove {metadata}
              .trim();
            pdfResponse =
              cleanSentence + (cleanSentence.endsWith(".") ? "" : ".");
          } else {
            // Fallback to first relevant line, but keep it short
            const firstLine = relevantLines[0].trim();
            const sentences = firstLine
              .split(/[.!?]+/)
              .filter((s) => s.trim().length > 10);
            // Clean the sentence to remove any metadata or source references
            let cleanSentence = sentences[0].trim();
            cleanSentence = cleanSentence
              .replace(/^(Source|Document|File|From):\s*/i, "")
              .replace(/\[.*?\]/g, "") // Remove [document references]
              .replace(/\(Source:.*?\)/gi, "") // Remove (Source: ...)
              .replace(/\{.*?\}/g, "") // Remove {metadata}
              .trim();
            pdfResponse =
              cleanSentence + (cleanSentence.endsWith(".") ? "" : ".");
          }
        } else if (
          userMessageLower.includes("how to") ||
          userMessageLower.includes("how do") ||
          userMessageLower.includes("steps") ||
          userMessageLower.includes("use") ||
          userMessageLower.includes("usage")
        ) {
          // For "how to" questions, find step-by-step or usage info
          const stepLines = relevantLines.filter((line) => {
            const lower = line.toLowerCase();
            return (
              lower.match(/\d+\./) || // Numbered steps
              lower.includes("step") ||
              lower.includes("first") ||
              lower.includes("follow")
            );
          });

          if (stepLines.length > 0) {
            // Include up to 4 steps
            pdfResponse = stepLines.slice(0, 4).join(" ");
          } else {
            // Get the first 2 relevant lines for general instructions
            pdfResponse = relevantLines.slice(0, 2).join(" ");
          }
        } else if (
          userMessageLower.includes("price") ||
          userMessageLower.includes("cost") ||
          userMessageLower.includes("fee") ||
          userMessageLower.includes("plan") ||
          userMessageLower.includes("billing")
        ) {
          // For pricing questions, find pricing information
          const pricingLines = relevantLines.filter((line) => {
            const lower = line.toLowerCase();
            return (
              lower.includes("$") ||
              lower.includes("pricing") ||
              lower.includes("month") ||
              lower.includes("plan") ||
              lower.includes("cost")
            );
          });

          if (pricingLines.length > 0) {
            pdfResponse = pricingLines.slice(0, 2).join(" ");
          } else {
            pdfResponse = relevantLines[0].trim();
          }
        } else if (
          userMessageLower.includes("feature") ||
          userMessageLower.includes("capability") ||
          userMessageLower.includes("function") ||
          userMessageLower.includes("key features")
        ) {
          // For feature questions, find feature list or key features
          const featureLines = relevantLines.filter((line) => {
            const lower = line.toLowerCase();
            return (
              lower.includes("feature") ||
              lower.includes("-") || // Bullet points
              lower.includes("includes") ||
              lower.includes("key")
            );
          });

          if (featureLines.length > 0) {
            // Get all feature lines but format them nicely
            pdfResponse = featureLines.slice(0, 5).join(" ");
          } else {
            pdfResponse = relevantLines.slice(0, 2).join(" ");
          }
        } else if (
          userMessageLower.includes("contact") ||
          userMessageLower.includes("support") ||
          userMessageLower.includes("help") ||
          userMessageLower.includes("email")
        ) {
          // For contact/support questions, find contact information
          const contactLines = relevantLines.filter((line) => {
            const lower = line.toLowerCase();
            return (
              lower.includes("@") ||
              lower.includes("email") ||
              lower.includes("contact") ||
              lower.includes("support") ||
              lower.includes("available")
            );
          });

          if (contactLines.length > 0) {
            pdfResponse = contactLines.slice(0, 2).join(" ");
          } else {
            pdfResponse = relevantLines[0].trim();
          }
        } else {
          // For other questions, provide a direct, concise answer
          // Take only the first relevant sentence
          const firstLine = relevantLines[0].trim();
          const sentences = firstLine
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 10);
          if (sentences.length > 0) {
            // Clean the sentence to remove any metadata or source references
            let cleanSentence = sentences[0].trim();
            cleanSentence = cleanSentence
              .replace(/^(Source|Document|File|From):\s*/i, "")
              .replace(/\[.*?\]/g, "") // Remove [document references]
              .replace(/\(Source:.*?\)/gi, "") // Remove (Source: ...)
              .replace(/\{.*?\}/g, "") // Remove {metadata}
              .trim();
            pdfResponse =
              cleanSentence + (cleanSentence.endsWith(".") ? "" : ".");
          } else {
            pdfResponse = firstLine;
          }
        }

        // Final cleaning pass - remove any remaining metadata/source references
        pdfResponse = pdfResponse
          .replace(/^(Source|Document|File|From):\s*/gi, "")
          .replace(/\[.*?\]/g, "") // Remove [document references]
          .replace(/\(Source:.*?\)/gi, "") // Remove (Source: ...)
          .replace(/\{.*?\}/g, "") // Remove {metadata}
          .replace(/Document ID:.*?(?=\.|$)/gi, "") // Remove Document ID
          .replace(/File:.*?(?=\.|$)/gi, "") // Remove File references
          .trim();

        console.log(
          `[PDF-CHAT] Generated PDF-based response: ${pdfResponse.substring(
            0,
            100
          )}...`
        );

        return {
          message: pdfResponse,
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
