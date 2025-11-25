import { env } from "../config/env.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}`;

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video";
  text?: { body: string };
  image?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename: string };
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: WhatsAppMessage[];
      };
      field: string;
    }[];
  }[];
}

export interface ParsedMessage {
  from: string;
  messageId: string;
  type: "text" | "image" | "document" | "unknown";
  text?: string;
  mediaId?: string;
  mimeType?: string;
  filename?: string;
}

export function parseWebhookPayload(payload: WhatsAppWebhookPayload): ParsedMessage | null {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) return null;

  const baseMessage = {
    from: message.from,
    messageId: message.id,
  };

  switch (message.type) {
    case "text":
      return { ...baseMessage, type: "text", text: message.text?.body };
    case "image":
      return {
        ...baseMessage,
        type: "image",
        mediaId: message.image?.id,
        mimeType: message.image?.mime_type,
      };
    case "document":
      return {
        ...baseMessage,
        type: "document",
        mediaId: message.document?.id,
        mimeType: message.document?.mime_type,
        filename: message.document?.filename,
      };
    default:
      return { ...baseMessage, type: "unknown" };
  }
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  const response = await fetch(`${WHATSAPP_API_URL}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
}

export async function getMediaUrl(mediaId: string): Promise<string> {
  const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get media URL");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  const response = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error("Failed to download media");
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getMediaAsBase64(mediaId: string): Promise<{ base64: string; mimeType: string }> {
  const mediaUrl = await getMediaUrl(mediaId);
  const buffer = await downloadMedia(mediaUrl);
  
  const urlResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });
  const mediaInfo = (await urlResponse.json()) as { mime_type: string };

  return {
    base64: buffer.toString("base64"),
    mimeType: mediaInfo.mime_type,
  };
}

export function isWebhookValid(payload: unknown): payload is WhatsAppWebhookPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "object" in payload &&
    (payload as WhatsAppWebhookPayload).object === "whatsapp_business_account"
  );
}

