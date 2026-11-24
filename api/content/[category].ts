import mysql from "mysql2/promise";

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

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, error: "Database is not configured" });
  }

  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await connection.execute(
      "SELECT id, sourceKey, channelUsername, channelTitle, telegramMessageId, category, requiredPlan, rawMessage, createdAt FROM telegramIptvImports WHERE category = ? ORDER BY createdAt DESC LIMIT 50",
      [category],
    );
    return res.status(200).json({ ok: true, category, items: rows });
  } catch (error) {
    console.error("[content] mysql query failed", { category, error });
    return res.status(503).json({ ok: false, error: "Content storage is temporarily unavailable" });
  } finally {
    await connection?.end().catch(() => undefined);
  }
}
