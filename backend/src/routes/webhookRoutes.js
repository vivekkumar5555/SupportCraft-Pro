import express from "express";
import Tenant from "../models/Tenant.js";
import {
  handleWhatsAppWebhook,
  handleInstagramWebhook,
  verifyWebhook,
} from "../services/socialService.js";

const router = express.Router();

// ─── WhatsApp Webhook ─────────────────────────────────────────────────────────

// GET  – Meta verification handshake
router.get("/whatsapp", async (req, res) => {
  try {
    const token = req.query["hub.verify_token"];

    // Find tenant whose verify token matches
    const tenant = await Tenant.findOne({
      "whatsapp.verifyToken": token,
      "whatsapp.enabled": true,
      isActive: true,
    });

    if (!tenant) {
      // Fallback: try env-level verify token for initial setup
      const envToken = process.env.WA_VERIFY_TOKEN;
      if (envToken && token === envToken) {
        return res.status(200).send(req.query["hub.challenge"]);
      }
      return res.sendStatus(403);
    }

    const result = verifyWebhook(req.query, token);
    if (result.valid) return res.status(200).send(result.challenge);
    return res.sendStatus(403);
  } catch (error) {
    console.error("[WA-WEBHOOK] Verification error:", error);
    return res.sendStatus(500);
  }
});

// POST – Incoming messages
router.post("/whatsapp", async (req, res) => {
  // Always respond 200 quickly so Meta doesn't retry
  res.sendStatus(200);

  try {
    await handleWhatsAppWebhook(req.body);
  } catch (error) {
    console.error("[WA-WEBHOOK] Processing error:", error);
  }
});

// ─── Instagram Webhook ────────────────────────────────────────────────────────

// GET  – Meta verification handshake
router.get("/instagram", async (req, res) => {
  try {
    const token = req.query["hub.verify_token"];

    const tenant = await Tenant.findOne({
      "instagram.verifyToken": token,
      "instagram.enabled": true,
      isActive: true,
    });

    if (!tenant) {
      const envToken = process.env.IG_VERIFY_TOKEN;
      if (envToken && token === envToken) {
        return res.status(200).send(req.query["hub.challenge"]);
      }
      return res.sendStatus(403);
    }

    const result = verifyWebhook(req.query, token);
    if (result.valid) return res.status(200).send(result.challenge);
    return res.sendStatus(403);
  } catch (error) {
    console.error("[IG-WEBHOOK] Verification error:", error);
    return res.sendStatus(500);
  }
});

// POST – Incoming messages
router.post("/instagram", async (req, res) => {
  res.sendStatus(200);

  try {
    await handleInstagramWebhook(req.body);
  } catch (error) {
    console.error("[IG-WEBHOOK] Processing error:", error);
  }
});

export default router;
