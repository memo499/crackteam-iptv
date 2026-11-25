import mysql from "mysql2/promise";

function getToken(req: any) {
  const authorization = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (authorization) return authorization;
  const cookie = String(req.headers.cookie ?? "");
  return cookie.match(/(?:^|;\s*)ct_iptv_session=([^;]+)/)?.[1] ?? "";
}

async function ensureTable(db: mysql.Connection) {
  await db.execute(`CREATE TABLE IF NOT EXISTS iptvProfiles (
    accountUsername varchar(32) NOT NULL PRIMARY KEY,
    displayName varchar(80) NULL,
    email varchar(320) NULL,
    language enum('tr','en') NOT NULL DEFAULT 'tr',
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ ok: false, error: "Method not allowed" });

  const authToken = getToken(req);
  if (!authToken) return res.status(401).json({ ok: false, error: "Login required" });
  const db = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await ensureTable(db);
    const [accounts] = await db.execute<any[]>("SELECT username, plan FROM iptvAccounts WHERE sessionToken = ? LIMIT 1", [authToken]);
    const account = accounts[0];
    if (!account) return res.status(401).json({ ok: false, error: "Login required" });

    if (req.method === "GET") {
      const [profiles] = await db.execute<any[]>("SELECT displayName, email, language, updatedAt FROM iptvProfiles WHERE accountUsername = ? LIMIT 1", [account.username]);
      return res.json({ ok: true, profile: { username: account.username, plan: account.plan, ...(profiles[0] ?? { displayName: "", email: "", language: "tr" }) } });
    }

    const body = req.body ?? {};
    const displayName = String(body.displayName ?? "").trim().slice(0, 80);
    const email = String(body.email ?? "").trim().slice(0, 320);
    const language = body.language === "en" ? "en" : "tr";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: "Geçerli bir e-posta adresi girin" });
    await db.execute(
      "INSERT INTO iptvProfiles (accountUsername, displayName, email, language) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), email = VALUES(email), language = VALUES(language)",
      [account.username, displayName || null, email || null, language],
    );
    return res.json({ ok: true, profile: { username: account.username, plan: account.plan, displayName, email, language } });
  } finally {
    await db.end();
  }
}
