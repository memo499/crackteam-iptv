import crypto from "node:crypto";
import mysql from "mysql2/promise";
function verifyPassword(password: string, stored: string) { const [salt, expected] = stored.split(":"); const actual = crypto.scryptSync(password, salt, 64).toString("hex"); return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, endpoint: "login", message: "Bu API POST isteği içindir. Giriş yapmak için CRACKTEAM İPTV uygulamasındaki giriş ekranını kullanın." });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const clean = String(req.body?.username ?? "").trim().toLowerCase();
  const db = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await db.execute<any[]>("SELECT username, passwordHash, plan FROM iptvAccounts WHERE username = ? LIMIT 1", [clean]);
    const account = rows[0];
    if (!account || !verifyPassword(String(req.body?.password ?? ""), account.passwordHash)) return res.status(401).json({ ok: false, error: "Kullanıcı adı veya parola hatalı" });
    const token = crypto.randomBytes(32).toString("hex");
    await db.execute("UPDATE iptvAccounts SET sessionToken = ? WHERE username = ?", [token, clean]);
    res.setHeader("Set-Cookie", `ct_iptv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`);
    return res.json({ ok: true, sessionToken: token, user: { username: account.username, plan: account.plan } });
  } finally { await db.end(); }
}
