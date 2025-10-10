import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Tenant from "../models/Tenant.js";
import Document from "../models/Document.js";
import Embedding from "../models/Embedding.js";
// Use mock service for seeding (no OpenAI required)
import { generateEmbeddings } from "../services/embeddingService.mock.js";

dotenv.config();

/**
 * Seed the database with sample data
 */
const seedDatabase = async () => {
  try {
    console.log("Starting database seeding...");

    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/chatbot";
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB:", mongoURI);

    // Clear existing data
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Document.deleteMany({});
    await Embedding.deleteMany({});
    console.log("Cleared existing data");

    // Create sample tenant
    const tenant = new Tenant({
      name: "Demo Company",
      domain: "demo.com",
      brandSettings: {
        primaryColor: "#3B82F6",
        secondaryColor: "#1E40AF",
        botName: "Demo Support Bot",
        welcomeMessage:
          "Hello! I'm here to help you with any questions about our services.",
        placeholderText: "Type your message...",
      },
      settings: {
        maxUploadSize: 10 * 1024 * 1024,
        allowedFileTypes: ["txt", "csv", "pdf"],
        responseDelay: 1000,
        enableTypingIndicator: true,
      },
    });

    await tenant.save();
    console.log("Created sample tenant:", tenant.name);

    // Create sample admin user
    const adminUser = new User({
      email: "admin@demo.com",
      password: "admin123",
      name: "Admin User",
      role: "admin",
      tenantId: tenant._id,
    });

    await adminUser.save();
    console.log("Created admin user:", adminUser.email);

    // Create sample regular user
    const regularUser = new User({
      email: "user@demo.com",
      password: "user123",
      name: "Regular User",
      role: "user",
      tenantId: tenant._id,
    });

    await regularUser.save();
    console.log("Created regular user:", regularUser.email);

    // Create sample documents with embeddings
    const sampleDocuments = [
      {
        title: "Product Information",
        content: `Our company offers a comprehensive AI-powered customer support solution. 
        The platform includes a chatbot widget that can be embedded on any website, 
        real-time chat functionality, and an admin panel for managing FAQs and settings.
        
        Key features:
        - Easy widget integration
        - Real-time chat with Socket.io
        - FAQ management system
        - Customizable branding
        - Analytics dashboard
        - Multi-tenant support
        
        Pricing starts at $29/month for the basic plan, $99/month for the pro plan, 
        and custom pricing for enterprise solutions.`,
      },
      {
        title: "Technical Support",
        content: `For technical support, please follow these steps:
        
        1. Check our documentation first
        2. Search our knowledge base
        3. Contact support via email: support@demo.com
        4. Use our live chat feature
        
        Common issues and solutions:
        - Widget not loading: Check your widget key and domain settings
        - Chat not responding: Verify your OpenAI API key is configured
        - Upload failures: Ensure file size is under 10MB and format is supported
        
        Our support team is available Monday-Friday, 9 AM - 6 PM EST.`,
      },
      {
        title: "Billing and Payments",
        content: `Billing Information:
        
        We accept all major credit cards and PayPal. Billing is processed monthly 
        or annually depending on your plan.
        
        Payment methods:
        - Visa, MasterCard, American Express
        - PayPal
        - Bank transfers (Enterprise only)
        
        Billing cycle:
        - Monthly plans: Billed on the same date each month
        - Annual plans: Billed once per year with 2 months free
        
        To update payment information, log into your admin panel and go to 
        Settings > Billing. For billing questions, contact billing@demo.com.`,
      },
      {
        title: "Account Management",
        content: `Account Management Guide:
        
        Creating an account:
        1. Visit our signup page
        2. Enter your company information
        3. Choose your plan
        4. Complete payment
        5. Access your admin panel
        
        Managing your account:
        - Update company information in Settings
        - Add team members with different roles
        - Monitor usage and analytics
        - Upgrade or downgrade your plan
        
        Security features:
        - Two-factor authentication
        - API key management
        - Activity logs
        - Data encryption
        
        For account-related questions, contact accounts@demo.com.`,
      },
      {
        title: "API Documentation",
        content: `API Documentation:
        
        Our platform provides RESTful APIs for integration:
        
        Authentication:
        - Use JWT tokens for API access
        - Include token in Authorization header
        - Tokens expire after 7 days
        
        Endpoints:
        - POST /api/chat/query - Send chat messages
        - GET /api/admin/documents - List documents
        - POST /api/admin/upload - Upload new documents
        - PUT /api/admin/settings - Update settings
        
        Rate Limits:
        - 100 requests per 15 minutes for general API
        - 10 requests per minute for chat queries
        - 20 uploads per hour
        
        WebSocket support:
        - Connect to /ws/chat namespace
        - Real-time chat functionality
        - Typing indicators and message events
        
        For API support, contact api@demo.com.`,
      },
    ];

    // Create documents and embeddings
    for (let i = 0; i < sampleDocuments.length; i++) {
      const docData = sampleDocuments[i];

      // Create document
      const document = new Document({
        tenantId: tenant._id,
        filename: `sample-${i + 1}.txt`,
        originalName: `${docData.title}.txt`,
        fileType: "txt",
        fileSize: docData.content.length,
        content: docData.content,
        metadata: {
          title: docData.title,
          description: `Sample document for ${docData.title.toLowerCase()}`,
          category: "General",
          author: "System",
        },
        processingStatus: "completed",
      });

      await document.save();

      // Split content into chunks
      const chunks = splitTextIntoChunks(document.content, 400);
      document.chunkCount = chunks.length;
      document.embeddingCount = chunks.length;
      await document.save();

      // Create embeddings for each chunk
      for (let j = 0; j < chunks.length; j++) {
        try {
          const embedding = await generateEmbeddings(chunks[j]);

          const embeddingDoc = new Embedding({
            tenantId: tenant._id,
            documentId: document._id,
            text: chunks[j],
            embedding: embedding,
            metadata: {
              chunkIndex: j,
              tokenCount: chunks[j].split(" ").length,
              category: "General",
            },
          });

          await embeddingDoc.save();
        } catch (error) {
          console.error(`Error creating embedding for chunk ${j}:`, error);
        }
      }

      console.log(`Created document: ${docData.title}`);
    }

    console.log("Database seeding completed successfully!");
    console.log("\nSample accounts created:");
    console.log("Admin: admin@demo.com / admin123");
    console.log("User: user@demo.com / user123");
    console.log(`Widget Key: ${tenant.widgetKey}`);
    console.log("\nYou can now test the application with these credentials.");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

/**
 * Split text into chunks
 * @param {string} text - Text to split
 * @param {number} maxTokens - Maximum tokens per chunk
 * @returns {Array<string>} - Array of text chunks
 */
const splitTextIntoChunks = (text, maxTokens) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    currentChunk.push(word);

    if (currentChunk.length >= maxTokens) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
};

// Run seeding if this file is executed directly
seedDatabase().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});

export default seedDatabase;
