/**
 * MOCK Chat Service for Testing (No OpenAI Required)
 * This generates PDF-grounded responses with smart fallbacks
 * Replace with real chatService.js when you have OpenAI credits
 */

import defaultAnswers, {
  getDefaultAnswer,
  detectMessageType,
} from "../config/defaultAnswers.js";

/**
 * Generate a mock chat response based on context
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
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate intelligent mock responses based on the question
    let mockResponse = "";

    // First check if this is a greeting or common interaction that should get default response
    const userMessageLower = userMessage.toLowerCase();
    const isGreeting = isGreetingMessage(userMessageLower);

    console.log(
      `[MOCK] Is greeting: ${isGreeting} for message: "${userMessageLower}"`
    );

    if (isGreeting) {
      // Use default response for greetings regardless of context
      mockResponse = getDefaultResponse(userMessageLower);
      console.log(
        `[MOCK] Using greeting response: ${mockResponse.substring(0, 50)}...`
      );
    } else if (context && context.trim().length > 0) {
      // Extract relevant information from context
      const contextLower = context.toLowerCase();

      // Find relevant sections from the context that match the user's question
      const contextLines = context
        .split("\n")
        .filter((line) => line.trim().length > 0);
      const relevantLines = contextLines.filter((line) => {
        const lineLower = line.toLowerCase();
        // Check if any word from the user's message appears in the context line
        const userWords = userMessageLower
          .split(/\s+/)
          .filter((word) => word.length > 1); // Reduced from 2 to 1 to include "hi"
        return userWords.some((word) => lineLower.includes(word));
      });

      // If we found relevant content, use it to generate a response
      if (relevantLines.length > 0) {
        // Take the most relevant line(s) and create a response
        const relevantContent = relevantLines.slice(0, 3).join(" ");

        // Generate specific responses based on common questions
        if (
          userMessageLower.includes("what is") ||
          userMessageLower.includes("what does") ||
          userMessageLower.includes("explain")
        ) {
          mockResponse = `Based on the information in your documents: ${relevantContent}`;
        } else if (
          userMessageLower.includes("how to") ||
          userMessageLower.includes("how do") ||
          userMessageLower.includes("steps")
        ) {
          mockResponse = `Here's what I found in your documents about this: ${relevantContent}`;
        } else if (
          userMessageLower.includes("price") ||
          userMessageLower.includes("cost") ||
          userMessageLower.includes("fee")
        ) {
          mockResponse = `Regarding pricing information: ${relevantContent}`;
        } else if (
          userMessageLower.includes("support") ||
          userMessageLower.includes("help") ||
          userMessageLower.includes("contact")
        ) {
          mockResponse = `For support and assistance: ${relevantContent}`;
        } else if (
          userMessageLower.includes("warranty") ||
          userMessageLower.includes("guarantee")
        ) {
          mockResponse = `About warranty information: ${relevantContent}`;
        } else if (
          userMessageLower.includes("features") ||
          userMessageLower.includes("capabilities") ||
          userMessageLower.includes("benefits")
        ) {
          mockResponse = `The features and capabilities include: ${relevantContent}`;
        } else {
          // For other questions, provide a direct answer using the relevant content
          mockResponse = `Based on your uploaded documents, here's what I found: ${relevantContent}`;
        }
      } else {
        // No specific matches found, but we have context - provide helpful default responses
        mockResponse = getDefaultResponse(userMessageLower);
      }
    } else {
      // No context fallback - use default responses
      mockResponse = getDefaultResponse(userMessageLower);
    }

    console.log(
      `[MOCK] Generated chat response for: "${userMessage.substring(0, 50)}..."`
    );
    console.log(
      `[MOCK] Context length: ${context ? context.length : 0} characters`
    );
    if (context && context.length > 0) {
      console.log(`[MOCK] Context preview: ${context.substring(0, 200)}...`);
    }

    return {
      message: mockResponse,
      confidence: 0.75,
      usage: {
        promptTokens: 150,
        completionTokens: 80,
        totalTokens: 230,
      },
      model: "mock-gpt-3.5-turbo",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating mock chat response:", error);
    throw new Error(`Failed to generate mock chat response: ${error.message}`);
  }
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
    `[MOCK] I don't have specific information about that in my knowledge base. Would you like to contact our support team for assistance?`,
    `[MOCK] I'm not able to find relevant information for your question. Let me connect you with a human support agent who can help.`,
    `[MOCK] That's a great question! I don't have that information readily available. Our support team would be happy to assist you.`,
  ];

  const randomMessage =
    fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

  let response = randomMessage;

  if (contactInfo) {
    response += ` You can reach us at ${contactInfo}.`;
  }

  console.log(`[MOCK] Generated fallback response`);

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

/**
 * Check if the message is a greeting or common interaction
 * @param {string} userMessageLower - The user's message in lowercase
 * @returns {boolean} - True if it's a greeting
 */
const isGreetingMessage = (userMessageLower) => {
  const greetingWords = [
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "thank",
    "thanks",
    "bye",
    "goodbye",
    "see you",
    "farewell",
    "help",
    "support",
    "assistance",
    "contact",
    "phone",
    "email",
    "price",
    "cost",
    "fee",
    "how much",
    "pricing",
    "what is",
    "what does",
    "explain",
    "how to",
    "how do",
    "features",
    "capabilities",
    "benefits",
    "advantages",
    "account",
    "login",
    "password",
    "sign in",
    "register",
    "technical",
    "troubleshoot",
    "problem",
    "issue",
    "error",
  ];

  return greetingWords.some((word) => userMessageLower.includes(word));
};

/**
 * Get default responses for common chatbot questions
 * @param {string} userMessageLower - The user's message in lowercase
 * @returns {string} - A default response
 */
const getDefaultResponse = (userMessageLower) => {
  // Common greeting responses
  if (
    userMessageLower.includes("hello") ||
    userMessageLower.includes("hi") ||
    userMessageLower.includes("hey") ||
    userMessageLower.includes("good morning") ||
    userMessageLower.includes("good afternoon") ||
    userMessageLower.includes("good evening")
  ) {
    return "Hello! I'm here to help you with any questions you might have. Feel free to ask me about our products, services, or any other information you need.";
  }

  // Help and support responses
  if (
    userMessageLower.includes("help") ||
    userMessageLower.includes("support") ||
    userMessageLower.includes("assistance")
  ) {
    return "I'm here to help! You can ask me about our products, services, pricing, features, or any other questions you might have. If I can't find the specific information you're looking for, I'll do my best to guide you in the right direction.";
  }

  // Contact information responses
  if (
    userMessageLower.includes("contact") ||
    userMessageLower.includes("phone") ||
    userMessageLower.includes("email") ||
    userMessageLower.includes("reach") ||
    userMessageLower.includes("speak to")
  ) {
    return "For direct contact with our team, you can reach out through our support channels. I can help answer many questions directly, but if you need to speak with a human representative, I can connect you with our support team.";
  }

  // Pricing and cost questions
  if (
    userMessageLower.includes("price") ||
    userMessageLower.includes("cost") ||
    userMessageLower.includes("fee") ||
    userMessageLower.includes("how much") ||
    userMessageLower.includes("pricing")
  ) {
    return "I'd be happy to help you with pricing information! The cost depends on your specific needs and requirements. You can find detailed pricing information in our uploaded documents, or I can connect you with our sales team for a personalized quote.";
  }

  // Product information
  if (
    userMessageLower.includes("product") ||
    userMessageLower.includes("service") ||
    userMessageLower.includes("what do you") ||
    userMessageLower.includes("what can you")
  ) {
    return "We offer a range of products and services designed to meet your needs. I can provide detailed information about our offerings based on the documentation we have available. What specific aspect would you like to know more about?";
  }

  // Features and capabilities
  if (
    userMessageLower.includes("feature") ||
    userMessageLower.includes("capability") ||
    userMessageLower.includes("benefit") ||
    userMessageLower.includes("advantage")
  ) {
    return "Our products come with many great features and capabilities! I can tell you about the specific benefits and advantages based on our documentation. What particular feature or benefit are you most interested in?";
  }

  // How-to questions
  if (
    userMessageLower.includes("how to") ||
    userMessageLower.includes("how do") ||
    userMessageLower.includes("steps") ||
    userMessageLower.includes("tutorial") ||
    userMessageLower.includes("guide")
  ) {
    return "I can help you with step-by-step instructions! Our documentation includes detailed guides and tutorials. What specific process or task would you like help with?";
  }

  // Account and login questions
  if (
    userMessageLower.includes("account") ||
    userMessageLower.includes("login") ||
    userMessageLower.includes("password") ||
    userMessageLower.includes("sign in") ||
    userMessageLower.includes("register")
  ) {
    return "I can help you with account-related questions! This includes information about creating accounts, logging in, password management, and account settings. What specific account issue can I help you with?";
  }

  // Technical support
  if (
    userMessageLower.includes("technical") ||
    userMessageLower.includes("troubleshoot") ||
    userMessageLower.includes("problem") ||
    userMessageLower.includes("issue") ||
    userMessageLower.includes("error")
  ) {
    return "I'm here to help with technical issues! I can provide troubleshooting steps, help resolve problems, and guide you through common technical challenges. What technical issue are you experiencing?";
  }

  // Thank you responses
  if (
    userMessageLower.includes("thank") ||
    userMessageLower.includes("thanks") ||
    userMessageLower.includes("appreciate")
  ) {
    return "You're very welcome! I'm glad I could help. Is there anything else you'd like to know?";
  }

  // Goodbye responses
  if (
    userMessageLower.includes("bye") ||
    userMessageLower.includes("goodbye") ||
    userMessageLower.includes("see you") ||
    userMessageLower.includes("farewell")
  ) {
    return "Goodbye! It was great helping you today. Feel free to come back anytime if you have more questions. Have a wonderful day!";
  }

  // Default response for unrecognized queries
  return `I understand you're asking about "${userMessageLower}". While I don't have specific information about this in our current documentation, I'd be happy to help you find what you're looking for. Could you provide more details about what you need, or would you like me to connect you with our support team?`;
};

console.log(
  "⚠️  MOCK CHAT SERVICE LOADED - Using enhanced responses with default fallbacks"
);
console.log(
  "   Replace chatService.mock.js with chatService.js when OpenAI is available"
);
