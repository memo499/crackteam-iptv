import crypto from "node:crypto";
import { getDb } from "../../server/db";
import { telegramIptvImports, telegramUsers } from "../../drizzle/schema";

const CHANNEL = "havadanyardim";
const CATEGORY_RE = /^@(iptv|steam|mail|film|spor|haber)(?:\s|$)/i;

function classify(text: string) {
  const match = text.trim().match(CATEGORY_RE);
  if (!match) return null;
  const category = match[1].toLowerCase() as "iptv" | "steam" | "mail" | "film" | "spor" | "haber";
  return { category, requiredPlan: category === "iptv" ? "free" as const : "pro" as const };
}

async function sendMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && req.headers["x-telegram-bot-api-secret-token"] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: "Invalid Telegram webhook secret" });
  }

  const update = req.body ?? {};
  const message = update.channel_post ?? update.message;
  if (!message) return res.json({ ok: true, ignored: "not_supported" });
  const text = String(message.text ?? message.caption ?? "");
  const chatId = String(message.chat?.id ?? "");
  let db;
  try {
    db = await getDb();
  } catch (error) {
    console.error("[telegram] database connection failed", error);
    return res.status(503).json({ ok: false, error: "Database is temporarily unavailable" });
  }
  if (!db) return res.status(503).json({ ok: false, error: "Database is not available" });

  if (update.message && /^\/(start|kayit|register)\b/i.test(text.trim())) {
    const telegramUserId = String(message.from?.id ?? chatId);
    await db.insert(telegramUsers).values({
      telegramUserId,
      username: message.from?.username ? String(message.from.username) : null,
      firstName: message.from?.first_name ? String(message.from.first_name) : null,
      plan: "ultra_trial",
      trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).onDuplicateKeyUpdate({ set: {
      username: message.from?.username ? String(message.from.username) : null,
      firstName: message.from?.first_name ? String(message.from.first_name) : null,
    } });
    await sendMessage(chatId, "CRACKTEAM İPTV kaydın tamamlandı. 30 gün boyunca Ultra denemen aktif.");
    return res.json({ ok: true, registered: true, trialDays: 30 });
  }

  if (!update.channel_post) return res.json({ ok: true, ignored: "direct_message_command_required" });
  const channelUsername = String(message.chat?.username ?? "").replace(/^@/, "").toLowerCase();
  if (channelUsername !== CHANNEL) return res.json({ ok: true, ignored: "channel_not_allowed" });
  const rule = classify(text);
  if (!rule) return res.json({ ok: true, ignored: "missing_supported_tag" });

  const sourceKey = crypto.createHash("sha256").update(`${chatId}:${message.message_id ?? text}`).digest("hex");
  try {
    await db.insert(telegramIptvImports).values({
      sourceKey,
      channelUsername,
      channelTitle: message.chat?.title ? String(message.chat.title) : null,
      telegramMessageId: Number.isInteger(Number(message.message_id)) ? Number(message.message_id) : null,
      category: rule.category,
      requiredPlan: rule.requiredPlan,
      rawMessage: text,
    }).onDuplicateKeyUpdate({ set: { rawMessage: text } });
  } catch (error) {
    console.error("[telegram] import insert failed", { category: rule.category, error });
    return res.status(503).json({ ok: false, error: "Content storage is temporarily unavailable" });
  }

  return res.json({ ok: true, imported: true, category: rule.category, sourceKey });
}
