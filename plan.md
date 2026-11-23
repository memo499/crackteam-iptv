# CRACKTEAM İPTV — Uygulama Planı

## Yaklaşım
CRACKTEAM İPTV için React/TypeScript ön yüzü, Express/tRPC sunucusu ve Drizzle/MySQL veri katmanı kullanılacak. İlk teslim; kullanıcı paneli, IPTV ekleme akışları, paketler, çekiliş, DM ve admin görünümünü gerçek ürün hissi veren bir prototip olarak sunar. Kalıcı veriler için tablo ve tRPC prosedürleri sonraki adımda bağlanabilir; hassas admin bilgileri kaynak koda yazılmayacak.

## Tasarım
- Alternatifler: **Neon yayın merkezi** (0.07), **Koyu sinema salonu** (0.11), **Kobalt yönetim konsolu** (0.06).
- Seçim: Neon yayın merkezi.
- Design Movement: Cyberpunk yayın kontrol odası; koyu yüzeyler üzerinde limon yeşili vurgu, ince grid çizgileri ve yayın sinyali motifleri.
- Core Principles: hızlı tarama, premium kontrast, komut merkezi hissi, küçük ekranlarda da net hiyerarşi.
- Color Philosophy: kömür siyahı güven ve odak sağlar; acid-lime canlılık ve aksiyon; mor/cyan tonları yayın sinyali ve ayrıcalık katmanlarını temsil eder.
- Layout Paradigm: solda sabit ikon rail, üstte durum/kimlik barı, içerikte geniş hero ve yatay veri bantları; klasik merkezlenmiş kart ızgarasından kaçınılır.
- Signature Elements: lime “LIVE” sinyali, mor spektrum blur, panel kenarlarında terminal çizgisi.
- Interaction: tıklamalar kısa, net ve geri bildirimli; plan yükseltme ve içerik ekleme çağrıları belirgin.
- Animation: yumuşak glow, içerik girişlerinde kısa slide-up, hover'da hafif border parlaması; dikkat dağıtan sürekli hareket yok.
- Typography: başlıklarda Space Grotesk benzeri yoğun grotesk, gövdede Inter/system; uppercase mikro etiketler.
- Brand Essence: yayınlarını tek bir havalı merkezden yönetmek isteyen IPTV kullanıcıları için hızlı ve ayrıcalıklı kontrol alanı. Kişilik: keskin, premium, topluluk odaklı.
- Brand Voice: “Yayın akışını tek merkezde tut.” / “Bugünün linki burada düşer.”
- Wordmark & Logo: CT harflerinden oluşan kırık sinyal monogramı; wordmark yanında lime nokta.
- Signature Brand Color: #D7FF43 acid-lime.

## Yapı
- `client/src/pages/Home.tsx`: ana dashboard ve etkileşimli prototip akışları.
- `client/src/index.css`: tema, panel yüzeyleri, grid/gloş görsel dili.
- `drizzle/schema.ts`: users tablosu korunur; IPTV, plan, çekiliş, DM tabloları sonraki kalıcı veri adımına hazırdır.
- `server/routers.ts`: auth korunur; domain prosedürleri sonraki adımda eklenecek.
- `public/manus-routes.json`: route manifest.

## Kapsam ve sınırlar
M3U/URL alanlarının doğrulama ve arayüz akışı bu sürümde bulunur. Telegram kanalından otomatik okuma, gerçek Telegram DM botu, ödeme ve kullanıcı bazlı kalıcı yetki için Telegram bot tokenı, webhook, ödeme sağlayıcısı ve güvenli secret yapılandırması gerekir; bu bilgiler koda gömülmeyecektir.
