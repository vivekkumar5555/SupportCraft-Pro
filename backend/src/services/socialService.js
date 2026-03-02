/**
 * Unified Social Messaging Service
 * Handles WhatsApp Business API and Instagram Messaging API
 * Uses the same document-based chat pipeline as the widget
 */

import Tenant from "../models/Tenant.js";
import { generateEmbeddings } from "./embeddingService.mock.js";
import { findSimilarDocuments } from "./similarityService.js";
import { generateChatResponse } from "./chatService.pdf.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// De-duplication: track recently processed message IDs (TTL 5 min)
const processedMessages = new Map();
const DEDUP_TTL_MS = 5 * 60 * 1000;

const markProcessed = (msgId) => {
  processedMessages.set(msgId, Date.now());
  // Cleanup old entries
  for (const [key, ts] of processedMessages) {
    if (Date.now() - ts > DEDUP_TTL_MS) processedMessages.delete(key);
  }
};

const isAlreadyProcessed = (msgId) => processedMessages.has(msgId);

/**
 * Process an incoming message through the document chat pipeline
 * Returns the bot's text reply
 */
const getDocumentAnswer = async (tenant, userMessage) => {
  try {
    if (!tenant.canMakeQuery()) {
      return "We've reached our message limit for this period. Please try again later.";
    }

    const queryEmbedding = await generateEmbeddings(userMessage);

    const similarDocs = await findSimilarDocuments(tenant._id, queryEmbedding, {
      limit: 15,
      minSimilarity: 0.02,
    });

    let context = "";
    const qualityMatches = similarDocs.filter((d) => d.similarity >= 0.005);

    if (qualityMatches.length > 0) {
      context = qualityMatches
        .slice(0, 5)
        .map((d) => d.embedding.text)
        .join("\n\n");
    } else if (similarDocs.length > 0) {
      context = similarDocs.map((d) => d.embedding.text).join("\n\n");
    }

    const response = await generateChatResponse(userMessage, context);
    await tenant.incrementQueryCount();

    return response.message;
  } catch (error) {
    console.error("[SOCIAL] Error generating answer:", error);
    return "I'm having trouble processing your message right now. Please try again later.";
  }
};

// ─── WhatsApp ────────────────────────────────────────────────────────────────

/**
 * Send a text message via WhatsApp Business API
 */
const sendWhatsAppMessage = async (phoneNumberId, accessToken, to, text) => {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[WA] Send failed:", res.status, err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }

  const data = await res.json();
  console.log(`[WA] Message sent to ${to}, id: ${data.messages?.[0]?.id}`);
  return data;
};

/**
 * Mark a WhatsApp message as read
 */
const markWhatsAppRead = async (phoneNumberId, accessToken, messageId) => {
  try {
    await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch (e) {
    // Non-critical; ignore
  }
};

/**
 * Handle incoming WhatsApp webhook payload
 */
export const handleWhatsAppWebhook = async (body) => {
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages?.length) return; // status update, not a message

  for (const msg of value.messages) {
    // Handle non-text messages with a friendly reply
    if (msg.type !== "text") {
      console.log(`[WA] Non-text message type: ${msg.type}`);
      if (isAlreadyProcessed(msg.id)) continue;
      markProcessed(msg.id);

      const phoneNumberId = value.metadata?.phone_number_id;
      const tenant = await Tenant.findOne({
        "whatsapp.phoneNumberId": phoneNumberId,
        "whatsapp.enabled": true,
        isActive: true,
      });
      if (tenant) {
        await sendWhatsAppMessage(
          phoneNumberId,
          tenant.whatsapp.accessToken,
          msg.from,
          "I can only process text messages at the moment. Please type your question and I'll help you!"
        ).catch(() => {});
      }
      continue;
    }

    if (isAlreadyProcessed(msg.id)) {
      console.log(`[WA] Duplicate message ${msg.id}, skipping`);
      continue;
    }
    markProcessed(msg.id);

    const senderPhone = msg.from;
    const userText = msg.text?.body?.trim();
    const phoneNumberId = value.metadata?.phone_number_id;

    if (!userText || !phoneNumberId) continue;

    console.log(`[WA] Incoming from ${senderPhone}: "${userText.substring(0, 60)}"`);

    // Find tenant by WhatsApp phone number ID
    const tenant = await Tenant.findOne({
      "whatsapp.phoneNumberId": phoneNumberId,
      "whatsapp.enabled": true,
      isActive: true,
    });

    if (!tenant) {
      console.warn(`[WA] No tenant for phoneNumberId ${phoneNumberId}`);
      continue;
    }

    // Mark as read
    await markWhatsAppRead(phoneNumberId, tenant.whatsapp.accessToken, msg.id);

    // Get answer from document pipeline
    const reply = await getDocumentAnswer(tenant, userText);

    // Send reply
    await sendWhatsAppMessage(
      phoneNumberId,
      tenant.whatsapp.accessToken,
      senderPhone,
      reply
    );
  }
};

// ─── Instagram ───────────────────────────────────────────────────────────────

/**
 * Send a text message via Instagram Messaging API
 */
const sendInstagramMessage = async (pageId, accessToken, recipientId, text) => {
  const url = `${GRAPH_API_BASE}/${pageId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[IG] Send failed:", res.status, err);
    throw new Error(`Instagram send failed: ${res.status}`);
  }

  const data = await res.json();
  console.log(`[IG] Message sent to ${recipientId}, id: ${data.message_id}`);
  return data;
};

/**
 * Handle incoming Instagram webhook payload
 */
export const handleInstagramWebhook = async (body) => {
  const entry = body?.entry?.[0];
  if (!entry?.messaging?.length) return;

  for (const event of entry.messaging) {
    // Skip echo messages (sent by the page itself), reactions, reads
    if (event.message?.is_echo) continue;
    if (!event.message) continue;

    // Handle non-text (images, stories, etc.) with friendly reply
    if (!event.message.text && event.message.attachments) {
      const msgId = event.message.mid;
      if (isAlreadyProcessed(msgId)) continue;
      markProcessed(msgId);

      const recipientId = event.recipient?.id;
      const tenant = await Tenant.findOne({
        $or: [
          { "instagram.pageId": recipientId },
          { "instagram.igUserId": recipientId },
        ],
        "instagram.enabled": true,
        isActive: true,
      });
      if (tenant) {
        await sendInstagramMessage(
          tenant.instagram.pageId,
          tenant.instagram.accessToken,
          event.sender.id,
          "I can only process text messages right now. Please type your question and I'll do my best to help!"
        ).catch(() => {});
      }
      continue;
    }

    if (!event.message?.text) continue;

    const msgId = event.message.mid;
    if (isAlreadyProcessed(msgId)) {
      console.log(`[IG] Duplicate message ${msgId}, skipping`);
      continue;
    }
    markProcessed(msgId);

    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id; // page ID
    const userText = event.message.text.trim();

    if (!senderId || !userText) continue;

    console.log(`[IG] Incoming from ${senderId}: "${userText.substring(0, 60)}"`);

    // Find tenant by Instagram page ID
    const tenant = await Tenant.findOne({
      $or: [
        { "instagram.pageId": recipientId },
        { "instagram.igUserId": recipientId },
      ],
      "instagram.enabled": true,
      isActive: true,
    });

    if (!tenant) {
      console.warn(`[IG] No tenant for pageId/igUserId ${recipientId}`);
      continue;
    }

    const reply = await getDocumentAnswer(tenant, userText);

    await sendInstagramMessage(
      tenant.instagram.pageId,
      tenant.instagram.accessToken,
      senderId,
      reply
    );
  }
};

// ─── Webhook verification (shared by both platforms) ─────────────────────────

/**
 * Verify webhook subscription (Meta sends a GET with hub.challenge)
 */
export const verifyWebhook = (query, expectedToken) => {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WEBHOOK] Verification successful");
    return { valid: true, challenge };
  }

  console.warn("[WEBHOOK] Verification failed");
  return { valid: false };
};

/**
 * Test connectivity: send a test message via WhatsApp
 */
export const testWhatsAppConnection = async (phoneNumberId, accessToken, testPhone) => {
  try {
    await sendWhatsAppMessage(phoneNumberId, accessToken, testPhone, "🤖 WhatsApp bot connected successfully! Your chatbot is now active.");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Test connectivity: send a test message via Instagram
 */
export const testInstagramConnection = async (pageId, accessToken, testUserId) => {
  try {
    await sendInstagramMessage(pageId, accessToken, testUserId, "🤖 Instagram bot connected successfully! Your chatbot is now active.");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
