export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    channel: "@havadanyardim",
    triggers: ["@iptv", "@steam", "@mail", "@film", "@spor", "@haber"],
    commands: ["/start", "/kayit", "/register", "/id", "/paket pro kullanıcı şifre", "/paket ultra kullanıcı şifre", "/ahmetonay", "/ahmethayır", "/evet", "/hayır"],
    adminUserIdConfigured: true,
    webhookPath: "/api/telegram/webhook",
  });
}
