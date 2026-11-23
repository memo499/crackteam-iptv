# TODO

## Tamamlanan teslimler

### Dashboard ve marka deneyimi
- [x] CRACKTEAM İPTV adı, koyu neon menü, durum barı ve premium yayın merkezi hissi uygulandı.
- [x] Türkçe/İngilizce dil düğmesi eklendi; ana navigasyon, başlıklar, planlar ve ekleme akışı dil değişimine tepki veriyor.

### IPTV ekleme ve listeleme
- [x] M3U alanı veya URL girişi için modal eklendi; yapıştırılan M3U metnindeki `#EXTINF` kayıtları sayılarak kanal algılama önizlemesi gösteriliyor.
- [x] Kullanıcı adı, parola ve link alanlarıyla Xtream/credential ekleme sekmesi eklendi.
- [x] IPTV listeleri durum, tip, kanal sayısı ve senkron bilgileriyle listeleniyor; arama çalışıyor.

### Paketler
- [x] Free: 0 TL / $0 ve reklamlı deneyim metni.
- [x] Pro: 50 TL / $1 ve düşük reklam mesajı.
- [x] Ultra: 100 TL / $2, çekiliş ve günlük ücretsiz IPTV ayrıcalıkları.

### Çekilişler, DM ve Ultra alanı
- [x] Çekiliş kartı, katılımcı/kalan süre görünümü ve katılım aksiyonu.
- [x] DM kutusu ve ct bot konuşma görünümü.
- [x] Yalnız Ultra üyeye özel ücretsiz IPTV sahnesi.
- [x] Admin panelinde çekiliş başlatma, Ultra IPTV paylaşma ve sonuç raporu aksiyonları.

## Sonraki entegrasyon adımları

- [ ] Veritabanına IPTV, plan, çekiliş, DM ve Ultra paylaşım tabloları eklenerek arayüz state'i kalıcı hale getirilecek.
- [ ] Admin rolü, güvenli secret/env üzerinden tanımlanacak; düz metin parola kaynak koda gömülmeyecek.
- [x] `ct bot` için Telegram bot tokenı secret olarak bağlandı; webhook endpoint'i ve otomatik `setWebhook` çağrısı eklendi.
- [x] `https://t.me/havadanyardim` kanalındaki `@iptv`, `@steam`, `@mail`, `@film`, `@spor` ve `@haber` etiketleri kategori/plan bilgisiyle içe aktarılıyor.
- [x] `/start`, `/kayit` ve `/register` komutlarıyla bot üzerinden kayıt olanlara tek seferlik 30 günlük Ultra denemesi veriliyor.
- [x] Steam, Mail, Film, Spor ve Haber Pro sekmeleri arayüze ve içerik API'sine eklendi.
- [ ] Gerçek Telegram DM bildirimleri ve çekiliş sonucu admin'e gönderimi bağlanacak.
- [ ] Gerçek ödeme sağlayıcısı ve plan entitlement akışı eklenecek.
