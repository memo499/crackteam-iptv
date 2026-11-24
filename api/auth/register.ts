import crypto from "node:crypto";
import mysql from "mysql2/promise";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function setSession(res: any, token: string) { res.setHeader("Set-Cookie", `ct_iptv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`); }
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const { username, password } = req.body ?? {};
  const clean = String(username ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(clean) || String(password ?? "").length < 6) return res.status(400).json({ ok: false, error: "Kullanıcı adı 3-32 karakter olmalı, parola en az 6 karakter olmalı" });
  const db = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const token = crypto.randomBytes(32).toString("hex");
    await db.execute("INSERT INTO iptvAccounts (username, passwordHash, plan, sessionToken) VALUES (?, ?, 'free', ?)", [clean, hashPassword(String(password)), token]);
    setSession(res, token);
    return res.status(201).json({ ok: true, sessionToken: token, user: { username: clean, plan: "free" } });
  } catch (error: any) { if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ ok: false, error: "Bu kullanıcı adı zaten kayıtlı" }); throw error; }
  finally { await db.end(); }
}
