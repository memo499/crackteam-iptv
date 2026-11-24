const categories = new Set(["iptv", "steam", "mail", "film", "spor", "haber"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const queryCategory = Array.isArray(req.query?.category) ? req.query.category[0] : req.query?.category;
  const pathCategory = String(req.url ?? "").match(/\/api\/content\/([^?/#]+)/)?.[1];
  const category = String(queryCategory ?? pathCategory ?? "").toLowerCase();
  if (!categories.has(category)) return res.status(400).json({ ok: false, error: "Unknown category" });

  const plan = String(req.query?.plan ?? "free");
  if (category !== "iptv" && !["pro", "ultra_trial"].includes(plan)) {
    return res.status(403).json({ ok: false, error: "Pro plan required" });
  }

  try {
    // Lazy imports keep Vercel's function loader from failing before the
    // handler can return a useful health/error response.
    const [{ desc, eq }, { getDb }, { telegramIptvImports }] = await Promise.all([
      import("drizzle-orm"),
      import("../../server/db"),
      import("../../drizzle/schema"),
    ]);
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Database is not available" });
    const rows = await db.select().from(telegramIptvImports)
      .where(eq(telegramIptvImports.category, category as any))
      .orderBy(desc(telegramIptvImports.createdAt))
      .limit(50);
    return res.status(200).json({ ok: true, category, items: rows });
  } catch (error) {
    console.error("[content] handler failed", { category, error });
    const detail = error instanceof Error ? error.message.replace(/mysql:\/\/[^\s]+/gi, "mysql://***") : "unknown";
    return res.status(503).json({ ok: false, error: "Content storage is temporarily unavailable", detail: detail.slice(0, 180) });
  }
}
