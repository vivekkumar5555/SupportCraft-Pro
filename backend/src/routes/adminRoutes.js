import express from "express";
import {
  uploadDocuments,
  getDocuments,
  deleteDocument,
  updateTenantSettings,
  getAnalytics,
} from "../controllers/adminController.js";

const router = express.Router();

// Document management routes
router.post("/upload", uploadDocuments);
router.get("/documents", getDocuments);
router.delete("/documents/:documentId", deleteDocument);

// Tenant settings routes
router.put("/settings", updateTenantSettings);

// Analytics routes
router.get("/analytics", getAnalytics);

export default router;
