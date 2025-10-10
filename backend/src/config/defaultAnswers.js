/**
 * Default Answers Configuration
 * These are the fallback responses when no relevant PDF content is found
 */

export default {
  // When no relevant information is found in documents
  notFound:
    "Sorry, I don't have that information in the uploaded documents. Please contact our support team for assistance.",

  // Greeting responses
  greeting: "Hello! How can I help you today?",

  // General fallback
  fallback:
    "I don't have specific information about that. Please contact support for more details.",

  // Help and support
  help: "I'm here to help! You can ask me about our products, services, or any other information you need.",

  // Contact information
  contact:
    "For direct contact with our team, you can reach out through our support channels.",

  // Pricing information
  pricing:
    "I don't have specific pricing information in the uploaded documents. Please contact our sales team for a personalized quote.",

  // Technical support
  technical:
    "I don't have specific technical information about that. Our technical support team would be happy to assist you.",

  // Account-related
  account:
    "I don't have specific account information in the uploaded documents. Please contact our support team for account assistance.",

  // Thank you responses
  thanks:
    "You're very welcome! I'm glad I could help. Is there anything else you'd like to know?",

  // Goodbye responses
  goodbye:
    "Goodbye! It was great helping you today. Feel free to come back anytime if you have more questions.",
};

/**
 * Get default answer based on message type
 * @param {string} messageType - The type of message (greeting, help, contact, etc.)
 * @returns {string} - The appropriate default answer
 */
export const getDefaultAnswer = (messageType) => {
  const defaultAnswers = {
    greeting: "Hello! How can I help you today?",
    help: "I'm here to help! You can ask me about our products, services, or any other information you need.",
    contact:
      "For direct contact with our team, you can reach out through our support channels.",
    pricing:
      "I don't have specific pricing information in the uploaded documents. Please contact our sales team for a personalized quote.",
    technical:
      "I don't have specific technical information about that. Our technical support team would be happy to assist you.",
    account:
      "I don't have specific account information in the uploaded documents. Please contact our support team for account assistance.",
    thanks:
      "You're very welcome! I'm glad I could help. Is there anything else you'd like to know?",
    goodbye:
      "Goodbye! It was great helping you today. Feel free to come back anytime if you have more questions.",
    fallback:
      "I don't have specific information about that. Please contact support for more details.",
    notFound:
      "Sorry, I don't have that information in the uploaded documents. Please contact our support team for assistance.",
  };

  return defaultAnswers[messageType] || defaultAnswers.notFound;
};

/**
 * Detect message type for appropriate default response
 * @param {string} userMessage - The user's message
 * @returns {string} - The detected message type
 */
export const detectMessageType = (userMessage) => {
  const message = userMessage.toLowerCase();

  // Greeting detection - more specific to avoid false positives
  if (
    message.includes("hello") ||
    message === "hi" ||
    message.startsWith("hi ") ||
    message === "hey" ||
    message.startsWith("hey ") ||
    message.includes("good morning") ||
    message.includes("good afternoon") ||
    message.includes("good evening")
  ) {
    return "greeting";
  }

  // Help detection
  if (
    message.includes("help") ||
    message.includes("support") ||
    message.includes("assistance")
  ) {
    return "help";
  }

  // Contact detection
  if (
    message.includes("contact") ||
    message.includes("phone") ||
    message.includes("email") ||
    message.includes("reach") ||
    message.includes("speak to")
  ) {
    return "contact";
  }

  // Pricing detection
  if (
    message.includes("price") ||
    message.includes("cost") ||
    message.includes("fee") ||
    message.includes("how much") ||
    message.includes("pricing")
  ) {
    return "pricing";
  }

  // Technical detection
  if (
    message.includes("technical") ||
    message.includes("troubleshoot") ||
    message.includes("problem") ||
    message.includes("issue") ||
    message.includes("error")
  ) {
    return "technical";
  }

  // Account detection
  if (
    message.includes("account") ||
    message.includes("login") ||
    message.includes("password") ||
    message.includes("sign in") ||
    message.includes("register")
  ) {
    return "account";
  }

  // Thanks detection
  if (
    message.includes("thank") ||
    message.includes("thanks") ||
    message.includes("appreciate")
  ) {
    return "thanks";
  }

  // Goodbye detection
  if (
    message.includes("bye") ||
    message.includes("goodbye") ||
    message.includes("see you") ||
    message.includes("farewell")
  ) {
    return "goodbye";
  }

  // Default to notFound for unrecognized messages
  return "notFound";
};
