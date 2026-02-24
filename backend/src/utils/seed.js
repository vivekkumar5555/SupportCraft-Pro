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
    // allow overriding widgetKey for consistent testing
    const seedWidgetKey = process.env.WIDGET_KEY || undefined;
    const tenant = new Tenant({
      name: "Demo Company",
      domain: "demo.com",
      // if seedWidgetKey is undefined, mongoose will generate a uuid automatically
      ...(seedWidgetKey ? { widgetKey: seedWidgetKey } : {}),
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
      {
        title: "Computer Specification - Frequently Asked Questions (FAQ)",
        content: `1. What is a processor (CPU)?
The CPU (Central Processing Unit) is the brain of the computer. It performs calculations and executes instructions from programs. Modern CPUs have multiple cores which allow them to process multiple tasks simultaneously.

2. What is RAM and how much do I need?
RAM (Random Access Memory) is temporary memory used to store data that the CPU is actively working on. For casual use, 8GB is sufficient. For gaming or professional work, 16GB or more is recommended.

3. What is the difference between SSD and HDD?
SSD (Solid State Drive) uses flash memory and has no moving parts, making it faster and more reliable. HDD (Hard Disk Drive) uses spinning magnetic platters which makes it slower but cheaper. SSDs are recommended for most users today due to their superior performance.

4. What is a graphics card (GPU)?
A GPU (Graphics Processing Unit) is a specialized processor designed for rendering graphics and handling parallel computations. Dedicated GPUs are essential for gaming and video editing, while integrated graphics are sufficient for everyday tasks.

5. What is the motherboard?
The motherboard is the main circuit board that connects all components of a computer. It allows the CPU, RAM, graphics card, and other components to communicate with each other.

6. What is the power supply unit (PSU)?
The PSU converts AC power from your wall outlet to DC power that the computer needs. A good quality PSU is important for stability and longevity of the system.

7. What is case airflow?
Case airflow refers to how air circulates inside the computer case to cool components. Proper airflow prevents overheating and hardware failure. Most cases have intake fans in front and exhaust fans in the back.

8. What are the benefits of an SSD over HDD?
SSDs offer faster boot times, quicker application loading, better performance in video editing, and improved overall responsiveness. They are also more durable since there are no moving parts.

9. What storage capacity should I choose?
For basic computing, 256GB is sufficient. For gaming or content creation, 512GB to 1TB is recommended. Professional users may need multiple terabytes of storage.

10. What is thermal paste and why is it important?
Thermal paste is a compound applied between the CPU and its cooler to improve heat transfer. Good thermal contact prevents CPU overheating and ensures stable performance.`,
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

      console.log(`Document ${document._id} content length: ${document.content.length}`);

      // Split content into chunks
      const chunks = splitTextIntoChunks(document.content, 400);
      document.chunkCount = chunks.length;
      document.embeddingCount = chunks.length;
      await document.save();

      // Ensure embeddings are generated for all chunks
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
          console.log(`Saved embedding for chunk ${j} of document ${document._id}`);
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
  // Split text into tokens including whitespace so we can preserve newline characters.
  const tokens = text.split(/(\s+)/); // captures spaces and newlines as separate tokens
  const chunks = [];
  let currentChunkTokens = [];
  let wordCount = 0;

  for (const token of tokens) {
    currentChunkTokens.push(token);
    // count words (non-whitespace tokens)
    if (!/\s+/.test(token)) {
      wordCount += 1;
    }

    if (wordCount >= maxTokens) {
      chunks.push(currentChunkTokens.join(""));
      currentChunkTokens = [];
      wordCount = 0;
    }
  }

  if (currentChunkTokens.length > 0) {
    chunks.push(currentChunkTokens.join(""));
  }

  return chunks;
};

// Run seeding if this file is executed directly
seedDatabase().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});

export default seedDatabase;
