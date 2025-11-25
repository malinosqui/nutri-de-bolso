import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { isWebhookValid, parseWebhookPayload } from "../services/whatsapp.js";
import { handleMessage } from "./message-router.js";

export function webhookVerify(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  res.sendStatus(200);

  try {
    if (!isWebhookValid(req.body)) {
      return;
    }

    const message = parseWebhookPayload(req.body);
    if (!message) {
      return;
    }

    await handleMessage(message);
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
}

