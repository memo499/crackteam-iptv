import crypto from "node:crypto";
import mysql from "mysql2/promise";

const CHANNEL = "havadanyardim";
const CATEGORY_RE = /^@(iptv|steam|mail|film|spor|haber)(?:\s|$)/i;

type Category = "iptv" | "steam" | "mail" | "film" | "spor" | "haber";

function classify(text: string) {
  const match = text.trim().match(CATEGORY_RE);
  if (!match) return null;
  const category = match[1].toLowerCase() as Category;
  return { category, requiredPlan: category === "iptv" ? "free" : "pro" } as const;
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
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, error: "Database is not configured" });

  const update = req.body ?? {};
  const message = update.channel_post ?? update.message;
  if (!message) return res.json({ ok: true, ignored: "not_supported" });
  const text = String(message.text ?? message.caption ?? "");
  const chatId = String(message.chat?.id ?? "");

  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);

    if (update.message && /^\/(start|kayit|register)\b/i.test(text.trim())) {
      const telegramUserId = String(message.from?.id ?? chatId);
      await connection.execute(
        "INSERT INTO telegramUsers (telegramUserId, username, firstName, plan, trialExpiresAt) VALUES (?, ?, ?, 'ultra_trial', DATE_ADD(NOW(), INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE username = VALUES(username), firstName = VALUES(firstName), plan = 'ultra_trial', trialExpiresAt = DATE_ADD(NOW(), INTERVAL 30 DAY)",
        [telegramUserId, message.from?.username ? String(message.from.username) : null, message.from?.first_name ? String(message.from.first_name) : null],
      );
      await sendMessage(chatId, "CRACKTEAM İPTV kaydın tamamlandı. 30 gün boyunca Ultra denemen aktif.");
      return res.json({ ok: true, registered: true, trialDays: 30 });
    }

    if (!update.channel_post) return res.json({ ok: true, ignored: "direct_message_command_required" });
    const channelUsername = String(message.chat?.username ?? "").replace(/^@/, "").toLowerCase();
    if (channelUsername !== CHANNEL) return res.json({ ok: true, ignored: "channel_not_allowed" });
    const rule = classify(text);
    if (!rule) return res.json({ ok: true, ignored: "missing_supported_tag" });

    const sourceKey = crypto.createHash("sha256").update(`${chatId}:${message.message_id ?? text}`).digest("hex");
    await connection.execute(
      "INSERT INTO telegramIptvImports (sourceKey, channelUsername, channelTitle, telegramMessageId, category, requiredPlan, rawMessage) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rawMessage = VALUES(rawMessage)",
      [sourceKey, channelUsername, message.chat?.title ? String(message.chat.title) : null, Number.isInteger(Number(message.message_id)) ? Number(message.message_id) : null, rule.category, rule.requiredPlan, text],
    );
    return res.json({ ok: true, imported: true, category: rule.category, sourceKey });
  } catch (error) {
    console.error("[telegram] handler failed", { error });
    return res.status(503).json({ ok: false, error: "Telegram content storage is temporarily unavailable" });
  } finally {
    await connection?.end().catch(() => undefined);
  }
}
