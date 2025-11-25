import express from "express";
import { env } from "./config/env.js";
import { webhookHandler, webhookVerify } from "./handlers/webhook.js";
import { startScheduler } from "./services/scheduler.js";

const app = express();

app.use(express.json());

app.get("/webhook", webhookVerify);
app.post("/webhook", webhookHandler);

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  startScheduler();
});

