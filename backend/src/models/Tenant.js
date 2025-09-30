import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    widgetKey: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    brandSettings: {
      primaryColor: {
        type: String,
        default: "#3B82F6",
      },
      secondaryColor: {
        type: String,
        default: "#1E40AF",
      },
      botName: {
        type: String,
        default: "Support Bot",
      },
      logoUrl: {
        type: String,
      },
      welcomeMessage: {
        type: String,
        default: "Hello! How can I help you today?",
      },
      placeholderText: {
        type: String,
        default: "Type your message...",
      },
    },
    settings: {
      maxUploadSize: {
        type: Number,
        default: 10 * 1024 * 1024, // 10MB
      },
      allowedFileTypes: {
        type: [String],
        default: ["txt", "csv", "pdf"],
      },
      responseDelay: {
        type: Number,
        default: 1000, // milliseconds
      },
      enableTypingIndicator: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "pro", "enterprise"],
        default: "free",
      },
      maxDocuments: {
        type: Number,
        default: 10,
      },
      maxQueriesPerMonth: {
        type: Number,
        default: 1000,
      },
      currentQueries: {
        type: Number,
        default: 0,
      },
      resetDate: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for widget key lookups
tenantSchema.index({ widgetKey: 1 });
tenantSchema.index({ domain: 1 });

// Method to check if tenant can upload more documents
tenantSchema.methods.canUploadDocument = function () {
  return this.subscription.currentDocuments < this.subscription.maxDocuments;
};

// Method to check if tenant can make more queries
tenantSchema.methods.canMakeQuery = function () {
  const now = new Date();
  if (now > this.subscription.resetDate) {
    this.subscription.currentQueries = 0;
    this.subscription.resetDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    this.save();
  }
  return (
    this.subscription.currentQueries < this.subscription.maxQueriesPerMonth
  );
};

// Method to increment query count
tenantSchema.methods.incrementQueryCount = function () {
  this.subscription.currentQueries += 1;
  return this.save();
};

export default mongoose.model("Tenant", tenantSchema);
