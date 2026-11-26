import crypto from "node:crypto";
import mysql from "mysql2/promise";

const CHANNEL = "havadanyardim";
const CATEGORY_RE = /^@(iptv|steam|mail|film|spor|haber)(?:\s|$)/i;
const PLAN_STARS = { pro: 50, ultra: 100 } as const;
const ADMIN_USER_ID = "7414579378";
const ADMIN_USERNAME = process.env.TELEGRAM_ADMIN_USERNAME ?? "@crackbaba";
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

async function sendShopFile(chatId: string, item: any, caption: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const method = item.mediaType === "audio" ? "sendAudio" : item.mediaType === "video" ? "sendVideo" : "sendDocument";
  const field = item.mediaType === "audio" ? "audio" : item.mediaType === "video" ? "video" : "document";
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, [field]: item.fileId, caption }),
  });
}

async function copyShopMessage(chatId: string, item: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, from_chat_id: item.sourceChatId, message_id: item.sourceMessageId }),
  });
}

function newRequestId() {
  return `CT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

function newTransactionCode() {
  const digits = (length: number) => crypto.randomInt(0, 10 ** length).toString().padStart(length, "0");
  const letters = (length: number) => Array.from({ length }, () => String.fromCharCode(65 + crypto.randomInt(0, 26))).join("");
  return `${digits(3)} ${letters(3)} ${digits(3)} ${letters(3)} ${digits(2)}`;
}

function approvalReceipt(request: any, transactionCode: string) {
  const plan = String(request.plan).toUpperCase();
  const username = String(request.accountUsername).toUpperCase();
  return [
    `CRACKTEAM IPTV ${plan} SATIN ALIMI`,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    `ADMİN ID  ${ADMIN_USER_ID}`,
    `İŞLEM KODU  ${transactionCode}`,
    "━━━━━━━━━━━━━━━━━━━━",
    `USER  ${username}`,
    "PASS  ##",
    "",
    `${plan} PAKET ALIMI ONAYLANDI`,
    "Hesabın başarıyla aktif edildi.",
    "",
    "CRACKTEAM IPTV ailesine hoş geldin.",
    "Güle güle kullan!",
  ].join("\n");
}

function helpMessage() {
  return [
    "CRACKTEAM İPTV / CT BOT",
    "━━━━━━━━━━━━━━━━━━━━",
    "Hoş geldin. Paket, kayıt ve destek işlemlerini buradan yönetebilirsin.",
    "",
    "KULLANICI KOMUTLARI",
    "/start — 30 günlük Ultra deneme kaydı",
    "/id — Telegram kullanıcı ID’ni gösterir",
    "/paket Pro Ahmet — Pro başvurusu",
    "/paket Ultra Ahmet — Ultra başvurusu",
    "/mağaza — Satıştaki ürünleri gösterir",
    "/satınal ÜRÜN_ID — Satın alma talebi oluşturur",
    "/help — Bu yardım menüsü",
    "",
    "PAKET BAŞVURU AKIŞI",
    "1. /paket Pro Ahmet veya /paket Ultra Ahmet yaz.",
    `2. ${ADMIN_USERNAME} hesabına gerekli Telegram Yıldızını gönder.`,
    `3. Ödeme sonrası ${ADMIN_USERNAME} hesabına DM at.`,
    "4. Admin kontrolünden sonra hesabın aktif edilir.",
    "",
    "ADMİN KOMUTLARI",
    `Admin ID: ${ADMIN_USER_ID}`,
    "/ahmetonay — Kullanıcı adına göre onayla",
    "/ahmethayır — Kullanıcı adına göre reddet",
    "/onay CT-XXXXXXXX — Talep koduyla onayla",
    "/evet veya /hayır — Sıradaki talebi yönet",
    "/newshop — Yeni mağaza ürünü ekleme sihirbazı",
    "/satinonay ID / /satinred ID — Eski siparişler için yönetim",
    "",
    "GÜVENLİK",
    "Parolanı Telegram’a gönderme. Bot parola istemez, kaydetmez ve onay mesajında yalnızca ## gösterir.",
    "",
    "Destek için admin hesabına DM gönderebilirsin.",
  ].join("\n");
}

async function ensureShopTables(connection: mysql.Connection) {
  await connection.execute(`CREATE TABLE IF NOT EXISTS botPreferences (
    telegramUserId VARCHAR(64) PRIMARY KEY,
    language ENUM('tr','en') NOT NULL DEFAULT 'tr',
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await connection.execute(`CREATE TABLE IF NOT EXISTS shopProducts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    price VARCHAR(64) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await connection.execute(`CREATE TABLE IF NOT EXISTS shopStock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    itemData LONGTEXT NOT NULL,
    status ENUM('available','sold') NOT NULL DEFAULT 'available',
    buyerTelegramUserId VARCHAR(64) NULL,
    soldAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX shopStock_product_status_idx (productId, status)
  )`);
  await connection.execute(`CREATE TABLE IF NOT EXISTS shopOrders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    buyerTelegramUserId VARCHAR(64) NOT NULL,
    buyerUsername VARCHAR(128) NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    stockId INT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approvedAt TIMESTAMP NULL,
    INDEX shopOrders_status_idx (status)
  )`);
  await connection.execute(`CREATE TABLE IF NOT EXISTS shopDrafts (
    telegramUserId VARCHAR(64) PRIMARY KEY,
    step VARCHAR(32) NOT NULL,
    productName VARCHAR(160) NULL,
    description TEXT NULL,
    price VARCHAR(64) NULL,
    stockTotal INT NULL,
    productId INT NULL,
    currentItem INT NOT NULL DEFAULT 1,
    items LONGTEXT NULL,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
}

async function setBotLanguage(connection: mysql.Connection, telegramUserId: string, language: "tr" | "en") {
  await connection.execute("INSERT INTO botPreferences (telegramUserId, language) VALUES (?, ?) ON DUPLICATE KEY UPDATE language = VALUES(language)", [telegramUserId, language]);
}

function isAdmin(message: any) {
  return String(message.from?.id ?? "") === ADMIN_USER_ID;
}

function shopMessage(rows: any[], language: "tr" | "en") {
  if (!rows.length) return language === "en" ? "CRACKTEAM SHOP\n━━━━━━━━━━━━━━━━━━━━\nThere are no products for sale right now." : "CRACKTEAM MAĞAZA\n━━━━━━━━━━━━━━━━━━━━\nŞu anda satışta ürün yok.";
  return [
    language === "en" ? "CRACKTEAM SHOP" : "CRACKTEAM MAĞAZA",
    "━━━━━━━━━━━━━━━━━━━━",
    ...rows.map((row) => language === "en" ? `#${row.id} ${row.name}\n${row.description}\nPrice: ${row.price}\nStock: ${row.stockCount}\nBuy: /buy ${row.id}` : `#${row.id} ${row.name}\n${row.description}\nFiyat: ${row.price}\nStok: ${row.stockCount}\nSatın almak için: /satınal ${row.id}`),
    "",
    language === "en" ? "If stock is available, delivery is automatic." : "Stok varsa teslimat otomatik yapılır.",
  ].join("\n\n");
}

function parseStockItem(text: string) {
  const values: Record<string, string> = {};
  const lines = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (lines.length === 1 && !/^https?:\/\//i.test(lines[0]) && !/^(?:ad|user|pass|password|şifre|link)\s*[:=]/i.test(lines[0])) {
    const separator = lines[0].indexOf(":");
    if (separator > 0 && separator < lines[0].length - 1) {
      values.username = lines[0].slice(0, separator).trim();
      values.password = lines[0].slice(separator + 1).trim();
    }
  }
  for (const line of lines) {
    const match = line.match(/^(ad|user|kullanıcı adı|pass|password|şifre|link)\s*[:=]?\s*(.+)$/i);
    if (!match) continue;
    const key = /^(ad|user|kullanıcı adı)$/i.test(match[1]) ? "username" : /^(pass|password|şifre)$/i.test(match[1]) ? "password" : "link";
    values[key] = match[2].trim();
  }
  if (!values.username || !values.password) return null;
  if (values.link && !/^https?:\/\//i.test(values.link)) values.link = `http://${values.link}`;
  return values;
}

function parseShopFile(message: any) {
  if (message.document?.file_id) return { kind: "file", mediaType: "document", fileId: String(message.document.file_id), fileName: String(message.document.file_name ?? "dosya") };
  if (message.audio?.file_id) return { kind: "file", mediaType: "audio", fileId: String(message.audio.file_id), fileName: String(message.audio.file_name ?? "ses.mp3") };
  if (message.video?.file_id) return { kind: "file", mediaType: "video", fileId: String(message.video.file_id), fileName: "video.mp4" };
  return null;
}

function parseShopMessage(message: any) {
  if (!message.message_id || !message.chat?.id) return null;
  const hasContent = Boolean(message.text || message.caption || message.photo || message.video || message.audio || message.document || message.voice || message.animation || message.sticker || message.contact || message.location || message.poll);
  if (!hasContent) return null;
  return { kind: "message", sourceChatId: String(message.chat.id), sourceMessageId: Number(message.message_id) };
}

async function handleShopList(connection: mysql.Connection, message: any) {
  await ensureShopTables(connection);
  const [rows] = await connection.execute<any[]>(`SELECT p.id, p.name, p.description, p.price, COUNT(s.id) AS stockCount
    FROM shopProducts p LEFT JOIN shopStock s ON s.productId = p.id AND s.status = 'available'
    WHERE p.active = 1 GROUP BY p.id ORDER BY p.createdAt DESC`);
  const [preferences] = await connection.execute<any[]>("SELECT language FROM botPreferences WHERE telegramUserId = ? LIMIT 1", [String(message.from?.id ?? message.chat?.id ?? "")]);
  await sendMessage(String(message.chat?.id ?? ""), shopMessage(rows, preferences[0]?.language === "en" ? "en" : "tr"));
  return { ok: true, shop: true, productCount: rows.length };
}

async function handleNewShop(connection: mysql.Connection, message: any) {
  if (!isAdmin(message)) { await sendMessage(String(message.chat?.id ?? ""), "Bu komut yalnızca admin tarafından kullanılabilir."); return { ok: false, error: "admin_only" }; }
  await ensureShopTables(connection);
  const adminId = ADMIN_USER_ID;
  await connection.execute("INSERT INTO shopDrafts (telegramUserId, step, currentItem, items) VALUES (?, 'name', 1, '[]') ON DUPLICATE KEY UPDATE step = 'name', currentItem = 1, items = '[]'", [adminId]);
  await sendMessage(String(message.chat?.id ?? ""), "Yeni mağaza ürünü başlatıldı.\n\n1/4 Ürün adını yazın:");
  return { ok: true, shopWizard: "name" };
}

async function handleShopWizard(connection: mysql.Connection, message: any, text: string) {
  if (!isAdmin(message)) return null;
  await ensureShopTables(connection);
  const [draftRows] = await connection.execute<any[]>("SELECT * FROM shopDrafts WHERE telegramUserId = ? LIMIT 1", [ADMIN_USER_ID]);
  const draft = draftRows[0];
  if (!draft) return null;
  const chatId = String(message.chat?.id ?? "");
  if (text.trim().toLowerCase() === "/cancelshop") { await connection.execute("DELETE FROM shopDrafts WHERE telegramUserId = ?", [ADMIN_USER_ID]); await sendMessage(chatId, "Mağaza ürün ekleme iptal edildi."); return { ok: true, cancelled: true }; }
  if (draft.step === "name") { await connection.execute("UPDATE shopDrafts SET step = 'description', productName = ? WHERE telegramUserId = ?", [text.trim().slice(0, 160), ADMIN_USER_ID]); await sendMessage(chatId, "2/4 Ürün açıklamasını yazın:"); return { ok: true, shopWizard: "description" }; }
  if (draft.step === "description") { await connection.execute("UPDATE shopDrafts SET step = 'price', description = ? WHERE telegramUserId = ?", [text.trim().slice(0, 4000), ADMIN_USER_ID]); await sendMessage(chatId, "3/4 Fiyatı yazın. Örnek: 50 TL / 2 USD"); return { ok: true, shopWizard: "price" }; }
  if (draft.step === "price") { await connection.execute("UPDATE shopDrafts SET step = 'stock', price = ? WHERE telegramUserId = ?", [text.trim().slice(0, 64), ADMIN_USER_ID]); await sendMessage(chatId, "4/4 Kaç adet stok var? Sadece sayı yazın:"); return { ok: true, shopWizard: "stock" }; }
  if (draft.step === "stock") {
    const count = Number.parseInt(text.trim(), 10);
    if (!Number.isInteger(count) || count < 1 || count > 5000) { await sendMessage(chatId, "Stok 1 ile 5000 arasında bir sayı olmalı."); return { ok: true, invalidStock: true }; }
    const [product] = await connection.execute<any>("INSERT INTO shopProducts (name, description, price) VALUES (?, ?, ?)", [draft.productName, draft.description, draft.price]);
    await connection.execute("UPDATE shopDrafts SET step = 'item', stockTotal = ?, productId = ?, currentItem = 1 WHERE telegramUserId = ?", [count, product.insertId, ADMIN_USER_ID]);
    await sendMessage(chatId, `Stok kaydı başladı. 1/${count} ürünü direkt Telegram mesajı olarak gönderin.\n\nDesteklenenler: düz metin, kullanıcı:şifre, IPTV bilgisi, fotoğraf, video, MP3, MP4, APK, belge, ses, sticker ve diğer mesaj türleri.`);
    return { ok: true, shopWizard: "item", stockTotal: count };
  }
  if (draft.step === "item") {
    const item = parseStockItem(text) ?? parseShopFile(message) ?? parseShopMessage(message);
    if (!item) { await sendMessage(chatId, "Bu mesaj türü stok olarak alınamadı. Düz metin, fotoğraf, video, ses, belge veya dosya gönderin."); return { ok: true, invalidStockItem: true }; }
    await connection.execute("INSERT INTO shopStock (productId, itemData) VALUES (?, ?)", [draft.productId, JSON.stringify(item)]);
    if (draft.currentItem >= draft.stockTotal) {
      await connection.execute("DELETE FROM shopDrafts WHERE telegramUserId = ?", [ADMIN_USER_ID]);
      await sendMessage(chatId, `Ürün mağazaya eklendi.\nÜrün: ${draft.productName}\nToplam stok: ${draft.stockTotal}`);
      return { ok: true, shopCreated: draft.productId };
    }
    await connection.execute("UPDATE shopDrafts SET currentItem = currentItem + 1 WHERE telegramUserId = ?", [ADMIN_USER_ID]);
    await sendMessage(chatId, `${draft.currentItem + 1}/${draft.stockTotal} ürünü direkt Telegram mesajı olarak gönderin.`);
    return { ok: true, stockAdded: draft.currentItem };
  }
  return null;
}

async function handleShopPurchase(connection: mysql.Connection, message: any, text: string) {
  await ensureShopTables(connection);
  const match = text.trim().match(/^\/(?:satınal|satinal|buy)\s+(\d+)$/i);
  const productId = Number(match?.[1]);
  const userId = String(message.from?.id ?? message.chat?.id ?? "");
  const [preferences] = await connection.execute<any[]>("SELECT language FROM botPreferences WHERE telegramUserId = ? LIMIT 1", [userId]);
  const language = preferences[0]?.language === "en" ? "en" : "tr";
  if (!productId) { await sendMessage(String(message.chat?.id ?? ""), language === "en" ? "Usage: /buy PRODUCT_ID\nUse /shop to see products." : "Kullanım: /satınal ÜRÜN_ID\nÜrünleri görmek için /mağaza yaz."); return { ok: true, purchaseHelp: true }; }
  const [products] = await connection.execute<any[]>("SELECT id, name, price FROM shopProducts WHERE id = ? AND active = 1 LIMIT 1", [productId]);
  if (!products[0]) { await sendMessage(String(message.chat?.id ?? ""), language === "en" ? "This product was not found or is no longer for sale." : "Bu ürün bulunamadı veya satıştan kaldırıldı."); return { ok: false, error: "product_not_found" }; }
  await connection.beginTransaction();
  try {
    const [stockRows] = await connection.execute<any[]>("SELECT id, itemData FROM shopStock WHERE productId = ? AND status = 'available' ORDER BY id ASC LIMIT 1 FOR UPDATE", [productId]);
    if (!stockRows[0]) { await connection.rollback(); await sendMessage(String(message.chat?.id ?? ""), language === "en" ? "This product is out of stock." : "Bu ürünün stoğu bitmiş."); return { ok: false, error: "out_of_stock" }; }
    const [result] = await connection.execute<any>("INSERT INTO shopOrders (productId, buyerTelegramUserId, buyerUsername, status, stockId, approvedAt) VALUES (?, ?, ?, 'approved', ?, NOW())", [productId, userId, message.from?.username ? String(message.from.username) : null, stockRows[0].id]);
    const orderId = result.insertId;
    await connection.execute("UPDATE shopStock SET status = 'sold', buyerTelegramUserId = ?, soldAt = NOW() WHERE id = ? AND status = 'available'", [userId, stockRows[0].id]);
    await connection.commit();
    const item = JSON.parse(stockRows[0].itemData);
    const heading = language === "en" ? `CRACKTEAM SHOP\nOrder #${orderId} completed.\nProduct: ${products[0].name}` : `CRACKTEAM MAĞAZA\nSipariş #${orderId} tamamlandı.\nÜrün: ${products[0].name}`;
    if (item.kind === "message") await copyShopMessage(userId, item);
    else if (item.kind === "file") await sendShopFile(userId, item, `${heading}\n\n${item.fileName}`);
    else await sendMessage(userId, `${heading}\n\n${language === "en" ? "USERNAME" : "AD"}  ${item.username}\n${language === "en" ? "PASSWORD" : "ŞİFRE"}  ${item.password}${item.link ? `\nLINK  ${item.link}` : ""}\n\n${language === "en" ? "Enjoy your purchase!" : "Güle güle kullan!"}`);
    await sendMessage(String(message.chat?.id ?? ""), language === "en" ? `Purchase #${orderId} completed automatically. Your item was delivered.` : `#${orderId} satın alımı otomatik tamamlandı. Ürünün gönderildi.`);
    return { ok: true, orderId, delivered: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function handleShopOrderDecision(connection: mysql.Connection, message: any, text: string) {
  if (!isAdmin(message)) { await sendMessage(String(message.chat?.id ?? ""), "Bu komut yalnızca admin tarafından kullanılabilir."); return { ok: false, error: "admin_only" }; }
  const match = text.trim().match(/^\/(satinonay|satinred|satınonay|satınred)\s+(\d+)$/i);
  if (!match) return null;
  const orderId = Number(match[2]);
  const approve = /onay/i.test(match[1]);
  const [orders] = await connection.execute<any[]>("SELECT o.*, p.name, p.price FROM shopOrders o JOIN shopProducts p ON p.id = o.productId WHERE o.id = ? LIMIT 1", [orderId]);
  const order = orders[0];
  if (!order || order.status !== "pending") { await sendMessage(String(message.chat?.id ?? ""), "Bekleyen mağaza talebi bulunamadı."); return { ok: false, error: "order_not_found" }; }
  if (!approve) { await connection.execute("UPDATE shopOrders SET status = 'rejected' WHERE id = ?", [orderId]); await sendMessage(String(order.buyerTelegramUserId), `Mağaza talebin #${orderId} reddedildi.`); await sendMessage(String(message.chat?.id ?? ""), `#${orderId} talebi reddedildi.`); return { ok: true, rejected: orderId }; }
  const [stockRows] = await connection.execute<any[]>("SELECT id, itemData FROM shopStock WHERE productId = ? AND status = 'available' ORDER BY id ASC LIMIT 1", [order.productId]);
  if (!stockRows[0]) { await sendMessage(String(message.chat?.id ?? ""), "Bu ürünün stoğu bitmiş."); return { ok: false, error: "out_of_stock" }; }
  const item = JSON.parse(stockRows[0].itemData);
  await connection.execute("UPDATE shopStock SET status = 'sold', buyerTelegramUserId = ?, soldAt = NOW() WHERE id = ? AND status = 'available'", [order.buyerTelegramUserId, stockRows[0].id]);
  await connection.execute("UPDATE shopOrders SET status = 'approved', stockId = ?, approvedAt = NOW() WHERE id = ?", [stockRows[0].id, orderId]);
  if (item.kind === "message") {
    await sendMessage(String(order.buyerTelegramUserId), `CRACKTEAM MAĞAZA\nSipariş #${orderId} onaylandı.\nÜrün: ${order.name}\n\nÜrün mesajı aşağıda gönderiliyor.`);
    await copyShopMessage(String(order.buyerTelegramUserId), item);
  } else if (item.kind === "file") {
    await sendShopFile(String(order.buyerTelegramUserId), item, `CRACKTEAM MAĞAZA\nSipariş #${orderId} onaylandı.\nÜrün: ${order.name}\nDosya: ${item.fileName}\n\nGüle güle kullan!`);
  } else {
    await sendMessage(String(order.buyerTelegramUserId), `CRACKTEAM MAĞAZA\n━━━━━━━━━━━━━━━━━━━━\nSipariş #${orderId} onaylandı.\nÜrün: ${order.name}\n\nAD  ${item.username}\nŞİFRE  ${item.password}${item.link ? `\nLINK  ${item.link}` : ""}\n\nGüle güle kullan!`);
  }
  await sendMessage(String(message.chat?.id ?? ""), `#${orderId} onaylandı. Stoktan 1 adet düşüldü ve bilgiler kullanıcıya DM gönderildi.`);
  return { ok: true, approved: orderId, stockId: stockRows[0].id };
}

async function createSubscriptionRequest(connection: mysql.Connection, message: any, plan: PaidPlan, username: string) {
  const requestId = newRequestId();
  const telegramUserId = String(message.from?.id ?? message.chat?.id ?? "");
  const telegramUsername = message.from?.username ? String(message.from.username) : null;
  await connection.execute(
    "INSERT INTO subscriptionRequests (requestId, telegramUserId, telegramUsername, accountUsername, plan, stars, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
    [requestId, telegramUserId, telegramUsername, username, plan, PLAN_STARS[plan]],
  );
  return { requestId, telegramUserId, telegramUsername, stars: PLAN_STARS[plan], plan, username };
}

async function handlePackageCommand(connection: mysql.Connection, message: any, text: string) {
  const parts = text.trim().split(/\s+/);
  const plan = parts[1]?.toLowerCase() as PaidPlan | undefined;
  if (!plan || !(plan in PLAN_STARS)) {
    await sendMessage(String(message.chat?.id ?? ""), "Paket başvurusu için şu formatı kullan:\n/paket Pro Ahmet\n/paket Ultra Ahmet\n\nYalnızca paket adını ve hesap kullanıcı adını yaz. Parola gönderme.");
    return { ok: true, packageHelp: true };
  }
  const username = parts[2];
  if (!username || parts.length !== 3) {
    await sendMessage(String(message.chat?.id ?? ""), `/paket ${plan === "pro" ? "Pro" : "Ultra"} Ahmet şeklinde gönder. Sadece paket ve kullanıcı adı gerekli; parola gönderme.`);
    return { ok: true, packageFormatRequired: true };
  }

  const request = await createSubscriptionRequest(connection, message, plan, username);
  const chatId = String(message.chat?.id ?? "");
  await sendMessage(chatId, `Talebin oluşturuldu: ${request.requestId}\n\n1. ${request.stars} Telegram Yıldızı ${ADMIN_USERNAME} hesabına gönder.\n2. Ödeme sonrası ${ADMIN_USERNAME} hesabına DM at.\n\nAdmin ödemeyi kontrol ettikten sonra paketini aktif edecek. Parola istenmedi ve kaydedilmedi.`);

  const adminId = ADMIN_USER_ID;
  if (adminId) {
    await sendMessage(adminId, `Sayın admin, ${username} başvuru yaptı.\nTalep: ${request.requestId}\nPaket: ${plan.toUpperCase()}\nYıldız: ${request.stars}\nTelegram kullanıcı: ${request.telegramUsername ? `@${request.telegramUsername}` : "kullanıcı adı yok"}\nKullanıcı hesabı: ${username}\n\nÖdeme geldiyse /${username}onay, gelmediyse /${username}hayır yaz. İstersen /evet veya /hayır da kullanabilirsin.`);
  }
  return { ok: true, packageRequest: request.requestId, stars: request.stars };
}

async function handleAdminApproval(connection: mysql.Connection, message: any, text: string) {
  const senderId = String(message.from?.id ?? "");
  if (senderId !== ADMIN_USER_ID) {
    await sendMessage(String(message.chat?.id ?? ""), "Bu komut yalnızca @crackbaba admin hesabından kullanılabilir.");
    return { ok: false, error: "admin_only" };
  }
  const normalized = text.trim();
  const codeMatch = normalized.match(/^\/(onay|approve|red|reject)\s+(CT-[A-Z0-9]+)$/i);
  const namedMatch = normalized.match(/^\/([a-zA-Z0-9_]+)(onay|hayır|hayir)$/i);
  const genericMatch = normalized.match(/^\/(evet|hayır|hayir)$/i);
  const approve = codeMatch ? /^(onay|approve)$/i.test(codeMatch[1]) : namedMatch ? /onay$/i.test(namedMatch[2]) : genericMatch ? /^\/evet$/i.test(normalized) : false;
  const reject = codeMatch ? /^(red|reject)$/i.test(codeMatch[1]) : namedMatch ? /hay/i.test(namedMatch[2]) : genericMatch ? /hay/i.test(normalized) : false;
  if (!approve && !reject) {
    await sendMessage(String(message.chat?.id ?? ""), "Kullanım: /ahmetonay, /ahmethayır, /evet, /hayır veya /onay CT-XXXXXXXX");
    return { ok: true, approvalHelp: true };
  }
  const requestId = codeMatch?.[2]?.toUpperCase();
  const accountUsername = namedMatch?.[1];
  const [rows] = requestId
    ? await connection.execute<any[]>("SELECT requestId, telegramUserId, telegramUsername, accountUsername, plan, stars, status FROM subscriptionRequests WHERE requestId = ? LIMIT 1", [requestId])
    : accountUsername
      ? await connection.execute<any[]>("SELECT requestId, telegramUserId, telegramUsername, accountUsername, plan, stars, status FROM subscriptionRequests WHERE accountUsername = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1", [accountUsername])
      : await connection.execute<any[]>("SELECT requestId, telegramUserId, telegramUsername, accountUsername, plan, stars, status FROM subscriptionRequests WHERE status = 'pending' ORDER BY createdAt DESC LIMIT 1");
  const request = rows[0];
  if (!request) {
    await sendMessage(String(message.chat?.id ?? ""), "Bekleyen bu kullanıcıya ait paket talebi bulunamadı.");
    return { ok: false, error: "request_not_found" };
  }
  if (request.status !== "pending") {
    await sendMessage(String(message.chat?.id ?? ""), `Bu talep zaten ${request.status === "approved" ? "onaylandı" : "reddedildi"}.`);
    return { ok: false, error: "request_already_processed" };
  }
  if (reject) {
    await connection.execute("UPDATE subscriptionRequests SET status = 'rejected' WHERE requestId = ?", [request.requestId]);
    await sendMessage(String(request.telegramUserId), `Paket talebin reddedildi. ${request.stars} Telegram Yıldızını @crackbaba hesabına gönderip tekrar deneyebilirsin.`);
    await sendMessage(String(message.chat?.id ?? ""), `${request.accountUsername} talebi reddedildi.`);
    return { ok: true, rejected: request.requestId };
  }
  await connection.execute("UPDATE subscriptionRequests SET status = 'approved', approvedAt = NOW() WHERE requestId = ?", [request.requestId]);
  await connection.execute("INSERT INTO telegramUsers (telegramUserId, username, plan) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), plan = VALUES(plan), trialExpiresAt = NULL", [String(request.telegramUserId), request.telegramUsername ?? null, request.plan]);
  await connection.execute("UPDATE iptvAccounts SET plan = ? WHERE username = ?", [request.plan, request.accountUsername]);
  const transactionCode = newTransactionCode();
  await sendMessage(String(request.telegramUserId), approvalReceipt(request, transactionCode));
  await sendMessage(String(message.chat?.id ?? ""), `Onay tamamlandı.\n\n${request.accountUsername} hesabı ${String(request.plan).toUpperCase()} planına geçirildi.\nİşlem kodu: ${transactionCode}`);
  return { ok: true, approved: request.requestId, plan: request.plan, transactionCode };
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
  if (update.message && /^\/help(?:@\w+)?\b/i.test(text.trim())) {
    await sendMessage(chatId, helpMessage());
    return res.json({ ok: true, help: true });
  }
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    if (update.message && /^\/id\b/i.test(text.trim())) {
      await sendMessage(chatId, `Telegram kullanıcı ID'n: ${String(message.from?.id ?? chatId)}\nBu numarayı admin yetkisi için kullanabilirsin.`);
      return res.json({ ok: true, userId: String(message.from?.id ?? chatId) });
    }
    if (update.message && /^\/eng(?:@\w+)?\b/i.test(text.trim())) {
      await ensureShopTables(connection);
      await setBotLanguage(connection, String(message.from?.id ?? chatId), "en");
      await sendMessage(chatId, "Language changed to English. Use /tr to switch back to Turkish.");
      return res.json({ ok: true, language: "en" });
    }
    if (update.message && /^\/tr(?:@\w+)?\b/i.test(text.trim())) {
      await ensureShopTables(connection);
      await setBotLanguage(connection, String(message.from?.id ?? chatId), "tr");
      await sendMessage(chatId, "Dil Türkçe olarak ayarlandı. İngilizce için /eng yazabilirsin.");
      return res.json({ ok: true, language: "tr" });
    }
    if (update.message && /^\/(?:mağaza|magaza|shop)\b/i.test(text.trim())) return res.json(await handleShopList(connection, message));
    if (update.message && /^\/newshop\b/i.test(text.trim())) return res.json(await handleNewShop(connection, message));
    if (update.message && /^\/(?:satınal|satinal|buy)\b/i.test(text.trim())) return res.json(await handleShopPurchase(connection, message, text));
    if (update.message && /^\/(?:satinonay|satinred|satınonay|satınred)\b/i.test(text.trim())) return res.json(await handleShopOrderDecision(connection, message, text));
    if (update.message) {
      const wizardResult = await handleShopWizard(connection, message, text);
      if (wizardResult) return res.json(wizardResult);
    }
    if (update.message && /^\/(paket|package|plan)\b/i.test(text.trim())) return res.json(await handlePackageCommand(connection, message, text));
    if (update.message && /^\/(onay|approve|red|reject|evet|hayır|hayir|[a-zA-Z0-9_]+(?:onay|hayır|hayir))\b/i.test(text.trim())) return res.json(await handleAdminApproval(connection, message, text));
    if (update.message && /^\/(start|kayit|register)\b/i.test(text.trim())) {
      const telegramUserId = String(message.from?.id ?? chatId);
      await connection.execute("INSERT INTO telegramUsers (telegramUserId, username, firstName, plan, trialExpiresAt) VALUES (?, ?, ?, 'ultra_trial', DATE_ADD(NOW(), INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE username = VALUES(username), firstName = VALUES(firstName), plan = 'ultra_trial', trialExpiresAt = DATE_ADD(NOW(), INTERVAL 30 DAY)", [telegramUserId, message.from?.username ? String(message.from.username) : null, message.from?.first_name ? String(message.from.first_name) : null]);
      await sendMessage(chatId, "CRACKTEAM İPTV kaydın tamamlandı. 30 gün boyunca Ultra denemen aktif.");
      return res.json({ ok: true, registered: true, trialDays: 30 });
    }
    // Channel posts arrive as `channel_post`; ordinary group posts arrive as
    // `message`. Both are valid content sources when the chat is configured.
    if (!update.channel_post && !update.message) return res.json({ ok: true, ignored: "unsupported_update" });
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
