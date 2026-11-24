import crypto from "node:crypto";
import mysql from "mysql2/promise";

const CHANNEL = "havadanyardim";
const CATEGORY_RE = /^@(iptv|steam|mail|film|spor|haber)(?:\s|$)/i;
const PLAN_STARS = { pro: 50, ultra: 100 } as const;
type Category = "iptv" | "steam" | "mail" | "film" | "spor" | "haber";
type PaidPlan = keyof typeof PLAN_STARS;

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

function newRequestId() {
  return `CT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

async function createSubscriptionRequest(connection: mysql.Connection, message: any, plan: PaidPlan, username: string) {
  const requestId = newRequestId();
  const telegramUserId = String(message.from?.id ?? message.chat?.id ?? "");
  const telegramUsername = message.from?.username ? String(message.from.username) : null;
  await connection.execute(
    "INSERT INTO subscriptionRequests (requestId, telegramUserId, telegramUsername, plan, stars, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    [requestId, telegramUserId, telegramUsername, plan, PLAN_STARS[plan]],
  );
  return { requestId, telegramUserId, telegramUsername, stars: PLAN_STARS[plan], plan, username };
}

async function handlePackageCommand(connection: mysql.Connection, message: any, text: string) {
  const parts = text.trim().split(/\s+/);
  const plan = parts[1]?.toLowerCase() as PaidPlan | undefined;
  if (!plan || !(plan in PLAN_STARS)) {
    await sendMessage(String(message.chat?.id ?? ""), "Paket seçimi için şu formatı kullan:\n/paket pro kullanıcı_adın şifren\n/paket ultra kullanıcı_adın şifren\n\nŞifren veritabanına kaydedilmez ve admin bildiriminde gösterilmez.");
    return { ok: true, packageHelp: true };
  }
  const username = parts[2];
  const password = parts[3];
  if (!username || !password) {
    await sendMessage(String(message.chat?.id ?? ""), `/${"paket"} ${plan} kullanıcı_adın şifren şeklinde gönder. Örnek: /paket ${plan} mehmet 1234\nŞifre sadece talep formatını doğrulamak için alınır; kaydedilmez.`);
    return { ok: true, packageFormatRequired: true };
  }

  const request = await createSubscriptionRequest(connection, message, plan, username);
  const chatId = String(message.chat?.id ?? "");
  await sendMessage(chatId, `Talebin oluşturuldu: ${request.requestId}\n\n1. @ct_bot botuna gir.\n2. ${plan.toUpperCase()} paket talebini gönder.\n3. ${request.stars} Telegram Yıldızı ${process.env.TELEGRAM_ADMIN_USERNAME ?? "@crackbaba"} hesabına gönder.\n4. Ödeme sonrası ${process.env.TELEGRAM_ADMIN_USERNAME ?? "@crackbaba"} hesabına DM at.\n\nAdmin ödemeyi kontrol ettikten sonra paketini aktif edecek. Şifren kaydedilmedi.`);

  const adminId = process.env.TELEGRAM_ADMIN_USER_ID;
  if (adminId) {
    await sendMessage(adminId, `Yeni paket talebi ${request.requestId}\nPaket: ${plan.toUpperCase()}\nYıldız: ${request.stars}\nTelegram kullanıcı: ${request.telegramUsername ? `@${request.telegramUsername}` : "kullanıcı adı yok"}\nKullanıcı hesabı: ${username}\n\nÖdeme geldikten sonra /onay ${request.requestId} komutunu gönder.`);
  }
  return { ok: true, packageRequest: request.requestId, stars: request.stars };
}

async function handleAdminApproval(connection: mysql.Connection, message: any, text: string) {
  const configuredAdminId = process.env.TELEGRAM_ADMIN_USER_ID;
  const senderId = String(message.from?.id ?? "");
  if (!configuredAdminId || senderId !== configuredAdminId) {
    await sendMessage(String(message.chat?.id ?? ""), "Bu komut yalnızca yapılandırılmış admin hesabından kullanılabilir.");
    return { ok: false, error: "admin_only" };
  }
  const match = text.trim().match(/^\/(onay|approve)\s+(CT-[A-Z0-9]+)$/i);
  const rejectMatch = text.trim().match(/^\/(red|reject)\s+(CT-[A-Z0-9]+)$/i);
  const requestId = match?.[2]?.toUpperCase() ?? rejectMatch?.[2]?.toUpperCase();
  if (!requestId) {
    await sendMessage(String(message.chat?.id ?? ""), "Kullanım: /onay CT-XXXXXXXX veya /red CT-XXXXXXXX");
    return { ok: true, approvalHelp: true };
  }
  const [rows] = await connection.execute<any[]>("SELECT requestId, telegramUserId, plan, stars, status FROM subscriptionRequests WHERE requestId = ? LIMIT 1", [requestId]);
  const request = rows[0];
  if (!request) {
    await sendMessage(String(message.chat?.id ?? ""), "Bu talep kodu bulunamadı.");
    return { ok: false, error: "request_not_found" };
  }
  if (request.status !== "pending") {
    await sendMessage(String(message.chat?.id ?? ""), `Bu talep zaten ${request.status === "approved" ? "onaylandı" : "reddedildi"}.`);
    return { ok: false, error: "request_already_processed" };
  }
  if (rejectMatch) {
    await connection.execute("UPDATE subscriptionRequests SET status = 'rejected' WHERE requestId = ?", [requestId]);
    await sendMessage(String(request.telegramUserId), `Paket talebin (${requestId}) admin tarafından reddedildi.`);
    await sendMessage(String(message.chat?.id ?? ""), `${requestId} reddedildi.`);
    return { ok: true, rejected: requestId };
  }
  const userPlan = request.plan;
  await connection.execute("UPDATE subscriptionRequests SET status = 'approved', approvedAt = NOW() WHERE requestId = ?", [requestId]);
  await connection.execute("INSERT INTO telegramUsers (telegramUserId, plan) VALUES (?, ?) ON DUPLICATE KEY UPDATE plan = VALUES(plan), trialExpiresAt = NULL", [String(request.telegramUserId), userPlan]);
  await sendMessage(String(request.telegramUserId), `Ödemen onaylandı. ${String(request.plan).toUpperCase()} paket hesabında aktif edildi.`);
  await sendMessage(String(message.chat?.id ?? ""), `${requestId} onaylandı ve kullanıcı hesabı aktif edildi.`);
  return { ok: true, approved: requestId, plan: request.plan };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && req.headers["x-telegram-bot-api-secret-token"] !== expectedSecret) return res.status(401).json({ ok: false, error: "Invalid Telegram webhook secret" });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, error: "Database is not configured" });
  const update = req.body ?? {};
  const message = update.channel_post ?? update.message;
  if (!message) return res.json({ ok: true, ignored: "not_supported" });
  const text = String(message.text ?? message.caption ?? "");
  const chatId = String(message.chat?.id ?? "");
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    if (update.message && /^\/id\b/i.test(text.trim())) {
      await sendMessage(chatId, `Telegram kullanıcı ID'n: ${String(message.from?.id ?? chatId)}\nBu numarayı admin yetkisi için kullanabilirsin.`);
      return res.json({ ok: true, userId: String(message.from?.id ?? chatId) });
    }
    if (update.message && /^\/(paket|package|plan)\b/i.test(text.trim())) return res.json(await handlePackageCommand(connection, message, text));
    if (update.message && /^\/(onay|approve|red|reject)\b/i.test(text.trim())) return res.json(await handleAdminApproval(connection, message, text));
    if (update.message && /^\/(start|kayit|register)\b/i.test(text.trim())) {
      const telegramUserId = String(message.from?.id ?? chatId);
      await connection.execute("INSERT INTO telegramUsers (telegramUserId, username, firstName, plan, trialExpiresAt) VALUES (?, ?, ?, 'ultra_trial', DATE_ADD(NOW(), INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE username = VALUES(username), firstName = VALUES(firstName), plan = 'ultra_trial', trialExpiresAt = DATE_ADD(NOW(), INTERVAL 30 DAY)", [telegramUserId, message.from?.username ? String(message.from.username) : null, message.from?.first_name ? String(message.from.first_name) : null]);
      await sendMessage(chatId, "CRACKTEAM İPTV kaydın tamamlandı. 30 gün boyunca Ultra denemen aktif.");
      return res.json({ ok: true, registered: true, trialDays: 30 });
    }
    if (!update.channel_post) return res.json({ ok: true, ignored: "direct_message_command_required" });
    const channelUsername = String(message.chat?.username ?? "").replace(/^@/, "").toLowerCase();
    if (channelUsername !== CHANNEL) return res.json({ ok: true, ignored: "channel_not_allowed" });
    const rule = classify(text);
    if (!rule) return res.json({ ok: true, ignored: "missing_supported_tag" });
    const sourceKey = crypto.createHash("sha256").update(`${chatId}:${message.message_id ?? text}`).digest("hex");
    await connection.execute("INSERT INTO telegramIptvImports (sourceKey, channelUsername, channelTitle, telegramMessageId, category, requiredPlan, rawMessage) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rawMessage = VALUES(rawMessage)", [sourceKey, channelUsername, message.chat?.title ? String(message.chat.title) : null, Number.isInteger(Number(message.message_id)) ? Number(message.message_id) : null, rule.category, rule.requiredPlan, text]);
    return res.json({ ok: true, imported: true, category: rule.category, sourceKey });
  } catch (error) {
    console.error("[telegram] handler failed", { error });
    return res.status(503).json({ ok: false, error: "Telegram content storage is temporarily unavailable" });
  } finally {
    await connection?.end().catch(() => undefined);
  }
}
