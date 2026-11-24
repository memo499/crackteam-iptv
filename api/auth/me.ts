import mysql from "mysql2/promise";
function token(req: any) { const raw = String(req.headers.cookie ?? ""); return raw.match(/(?:^|;\s*)ct_iptv_session=([^;]+)/)?.[1] ?? ""; }
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const db = await mysql.createConnection(process.env.DATABASE_URL!);
  try { const [rows] = await db.execute<any[]>("SELECT username, plan FROM iptvAccounts WHERE sessionToken = ? LIMIT 1", [token(req)]); return res.json({ ok: true, user: rows[0] ?? null }); }
  finally { await db.end(); }
}
