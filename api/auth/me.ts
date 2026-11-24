import mysql from "mysql2/promise";
function token(req: any) { const raw = String(req.headers.cookie ?? ""); return raw.match(/(?:^|;\s*)ct_iptv_session=([^;]+)/)?.[1] ?? ""; }
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const authToken = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || token(req);
  const db = await mysql.createConnection(process.env.DATABASE_URL!);
  try { const [rows] = await db.execute<any[]>("SELECT username, plan FROM iptvAccounts WHERE sessionToken = ? LIMIT 1", [authToken]); return res.json({ ok: true, user: rows[0] ?? null }); }
  finally { await db.end(); }
}
