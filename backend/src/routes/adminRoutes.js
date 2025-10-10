import express from "express";
import {
  uploadDocuments,
  getUploadStatus,
  getDocuments,
  deleteDocument,
  updateTenantSettings,
  getAnalytics,
  updateSubscriptionPlan,
} from "../controllers/adminController.js";

const router = express.Router();

// Document management routes
router.post("/upload", uploadDocuments);
router.get("/upload/status/:uploadId", getUploadStatus);
router.get("/documents", getDocuments);
router.delete("/documents/:documentId", deleteDocument);

// Tenant settings routes
router.put("/settings", updateTenantSettings);

// Analytics routes
router.get("/analytics", getAnalytics);

// Subscription routes
router.put("/subscription", updateSubscriptionPlan);

export default router;
