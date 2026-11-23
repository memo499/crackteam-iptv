import { desc, eq } from "drizzle-orm";
import { getDb } from "../../server/db";
import { telegramIptvImports } from "../../drizzle/schema";

const categories = new Set(["iptv", "steam", "mail", "film", "spor", "haber"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const category = String(req.query?.category ?? "").toLowerCase();
  if (!categories.has(category)) return res.status(400).json({ ok: false, error: "Unknown category" });
  const plan = String(req.query?.plan ?? "free");
  if (category !== "iptv" && !["pro", "ultra_trial"].includes(plan)) {
    return res.status(403).json({ ok: false, error: "Pro plan required" });
  }
  const db = await getDb();
  if (!db) return res.status(503).json({ ok: false, error: "Database is not available" });
  const rows = await db.select().from(telegramIptvImports).where(eq(telegramIptvImports.category, category as any)).orderBy(desc(telegramIptvImports.createdAt)).limit(50);
  return res.json({ ok: true, category, items: rows });
}
