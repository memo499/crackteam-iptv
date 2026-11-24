import { desc, eq } from "drizzle-orm";
import { getDb } from "../../server/db";
import { telegramIptvImports } from "../../drizzle/schema";

const categories = new Set(["iptv", "steam", "mail", "film", "spor", "haber"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  // Vercel normally provides req.query.category, but the same handler is also
  // used by the local Express adapter where the dynamic segment is only in
  // req.url. Keep both paths working so a missing adapter query cannot crash
  // the whole serverless invocation.
  const queryCategory = Array.isArray(req.query?.category) ? req.query.category[0] : req.query?.category;
  const pathCategory = String(req.url ?? "").match(/\/api\/content\/([^?/#]+)/)?.[1];
  const category = String(queryCategory ?? pathCategory ?? "").toLowerCase();
  if (!categories.has(category)) return res.status(400).json({ ok: false, error: "Unknown category" });
  const plan = String(req.query?.plan ?? "free");
  if (category !== "iptv" && !["pro", "ultra_trial"].includes(plan)) {
    return res.status(403).json({ ok: false, error: "Pro plan required" });
  }
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Database is not available" });
    const rows = await db.select().from(telegramIptvImports)
      .where(eq(telegramIptvImports.category, category as any))
      .orderBy(desc(telegramIptvImports.createdAt))
      .limit(50);
    return res.status(200).json({ ok: true, category, items: rows });
  } catch (error) {
    console.error("[content] database query failed", { category, error });
    return res.status(503).json({ ok: false, error: "Content storage is temporarily unavailable" });
  }
}
