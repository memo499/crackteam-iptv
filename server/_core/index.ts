import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "../db";
import { telegramIptvImports } from "../../drizzle/schema";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

const TELEGRAM_CHANNEL = "havadanyardim";

async function registerTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!token || !webhookUrl) {
    console.log("[Telegram] Webhook bekleniyor: TELEGRAM_WEBHOOK_URL ayarlanınca otomatik bağlanır.");
    return;
  }

  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["channel_post"],
        ...(secret ? { secret_token: secret } : {}),
      }),
    });
    const result = await response.json();
    console.log("[Telegram] Webhook sonucu:", result);
  } catch (error) {
    console.error("[Telegram] Webhook bağlanamadı:", error);
  }
}

function extractTelegramChannelPost(update: any) {
  const message = update?.channel_post;
  if (!message) return null;
  const text = String(message.text ?? message.caption ?? "");
  const channelUsername = String(message.chat?.username ?? "").replace(/^@/, "").toLowerCase();
  const messageId = Number(message.message_id);
  return {
    text,
    channelUsername,
    channelTitle: message.chat?.title ? String(message.chat.title) : null,
    messageId: Number.isInteger(messageId) ? messageId : null,
    chatId: String(message.chat?.id ?? channelUsername),
  };
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/telegram/status", (_req, res) => {
    res.json({
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      webhookConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_URL),
      channel: `@${TELEGRAM_CHANNEL}`,
      trigger: "@iptv",
      webhookPath: "/api/telegram/webhook",
    });
  });
  app.post("/api/telegram/webhook", async (req, res) => {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && req.header("x-telegram-bot-api-secret-token") !== expectedSecret) {
      res.status(401).json({ ok: false, error: "Invalid Telegram webhook secret" });
      return;
    }

    const post = extractTelegramChannelPost(req.body);
    if (!post) {
      res.json({ ok: true, ignored: "not_a_channel_post" });
      return;
    }
    if (post.channelUsername !== TELEGRAM_CHANNEL) {
      res.json({ ok: true, ignored: "channel_not_allowed" });
      return;
    }
    if (!/^@iptv(?:\s|$)/i.test(post.text.trim())) {
      res.json({ ok: true, ignored: "missing_iptv_tag" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(503).json({ ok: false, error: "Database is not available" });
      return;
    }

    const sourceKey = crypto.createHash("sha256").update(`${post.chatId}:${post.messageId ?? post.text}`).digest("hex");
    await db.insert(telegramIptvImports).values({
      sourceKey,
      channelUsername: post.channelUsername,
      channelTitle: post.channelTitle,
      telegramMessageId: post.messageId,
      rawMessage: post.text,
    }).onDuplicateKeyUpdate({ set: { rawMessage: post.text } });

    res.json({ ok: true, imported: true, sourceKey });
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
    void registerTelegramWebhook();
  });
}

startServer().catch(error => { console.error(error); process.exit(1); });
