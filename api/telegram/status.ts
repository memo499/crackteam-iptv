export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    channel: "@havadanyardim",
    triggers: ["@iptv", "@steam", "@mail", "@film", "@spor", "@haber"],
    commands: ["/start", "/kayit", "/register"],
    webhookPath: "/api/telegram/webhook",
  });
}
