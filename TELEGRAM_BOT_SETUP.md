# CT Bot — Telegram webhook kurulumu

CT Bot, ayrı bir VPS veya sürekli açık bilgisayar gerektirmez. Uygulamanın yayınlanmış Express sunucusu webhook endpoint'ini barındırır ve sunucu başladığında Telegram `setWebhook` çağrısını otomatik yapar.

## Gerekenler

BotFather üzerinden bir bot oluşturun ve botu `@havadanyardim` kanalına yönetici olarak ekleyin. Botun kanal gönderilerini görme yetkisi olmalıdır. Bot tokenı sohbet mesajına yazılmamalıdır; proje secret alanına `TELEGRAM_BOT_TOKEN` adıyla girilmelidir.

Uygulama yayınlandıktan sonra `TELEGRAM_WEBHOOK_URL` secret değerini şu biçimde tanımlayın:

```text
https://YAYINLANAN-DOMAIN/api/telegram/webhook
```

İsteğe bağlı olarak `TELEGRAM_WEBHOOK_SECRET` eklenebilir. Bu değer Telegram'ın `x-telegram-bot-api-secret-token` başlığını doğrulamak için kullanılır.

## Çalışma kuralı

Bot yalnızca `@havadanyardim` kanalındaki gönderileri dinler. Mesajın veya medya açıklamasının başı büyük/küçük harf duyarsız biçimde `@iptv` ile başlıyorsa mesajın tamamını `telegramIptvImports` tablosuna kaydeder. Aynı Telegram mesajı tekrar gönderilirse ikinci kez oluşturulmaz.

Webhook endpoint'i:

```text
POST /api/telegram/webhook
```

Durum endpoint'i:

```text
GET /api/telegram/status
```

Bu kurulumda webhook kodu Manus sunucusunda çalışır; VPS, cron veya yerel bot süreci gerekmez.
