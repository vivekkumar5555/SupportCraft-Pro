import OpenAI from "openai";

// Initialize OpenAI client lazily
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

/**
 * Generate a chat response using OpenAI's completion API
 * @param {string} userMessage - The user's message
 * @param {string} context - The context from similar documents
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - The generated response
 */
export const generateChatResponse = async (
  userMessage,
  context,
  options = {}
) => {
  try {
    const {
      model = "gpt-3.5-turbo",
      maxTokens = 500,
      temperature = 0.7,
      systemPrompt = null,
    } = options;

    // Default system prompt
    const defaultSystemPrompt = `You are a helpful customer support assistant. Use the provided context to answer user questions accurately and helpfully. If the context doesn't contain relevant information, politely let the user know and offer to connect them with human support.

Guidelines:
- Be concise but comprehensive
- Use a friendly, professional tone
- If you're unsure about something, say so
- Always be helpful and solution-oriented
- Don't make up information not in the context`;

    const systemMessage = systemPrompt || defaultSystemPrompt;

    // Construct the prompt with context
    const messages = [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: `Context from knowledge base:
${context}

User question: ${userMessage}

Please provide a helpful response based on the context above.`,
      },
    ];

    // Call OpenAI API
    const response = await getOpenAIClient().chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response generated from OpenAI");
    }

    const generatedText = response.choices[0].message.content;
    const usage = response.usage;

    // Calculate confidence based on usage and response length
    const confidence = calculateConfidence(generatedText, usage);

    return {
      message: generatedText.trim(),
      confidence,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      model,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating chat response:", error);

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

    throw new Error(`Failed to generate chat response: ${error.message}`);
  }
};

/**
 * Calculate confidence score for the generated response
 * @param {string} response - The generated response
 * @param {Object} usage - Token usage information
 * @returns {number} - Confidence score between 0 and 1
 */
const calculateConfidence = (response, usage) => {
  let confidence = 0.8; // Base confidence

  // Adjust based on response length
  if (response.length < 50) {
    confidence -= 0.2; // Short responses might be less confident
  } else if (response.length > 200) {
    confidence += 0.1; // Longer responses might be more detailed
  }

  // Adjust based on token usage
  if (usage) {
    const efficiency = usage.completion_tokens / usage.prompt_tokens;
    if (efficiency > 0.3) {
      confidence += 0.1; // Good efficiency
    } else if (efficiency < 0.1) {
      confidence -= 0.2; // Poor efficiency
    }
  }

  // Check for uncertainty indicators
  const uncertaintyWords = [
    "might",
    "could",
    "possibly",
    "perhaps",
    "maybe",
    "not sure",
    "unclear",
  ];
  const hasUncertainty = uncertaintyWords.some((word) =>
    response.toLowerCase().includes(word)
  );

  if (hasUncertainty) {
    confidence -= 0.1;
  }

  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
};

/**
 * Generate a fallback response when no context is found
 * @param {string} userMessage - The user's message
 * @param {Object} options - Additional options
 * @returns {Object} - The fallback response
 */
export const generateFallbackResponse = (userMessage, options = {}) => {
  const { botName = "Support Bot", contactInfo = null } = options;

  const fallbackMessages = [
    `I don't have specific information about that in my knowledge base. Would you like to contact our support team for assistance?`,
    `I'm not able to find relevant information for your question. Let me connect you with a human support agent who can help.`,
    `That's a great question! I don't have that information readily available. Our support team would be happy to assist you.`,
  ];

  const randomMessage =
    fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

  let response = randomMessage;

  if (contactInfo) {
    response += ` You can reach us at ${contactInfo}.`;
  }

  return {
    message: response,
    confidence: 0.3,
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
  // In production, you might want to use more sophisticated NLP
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
