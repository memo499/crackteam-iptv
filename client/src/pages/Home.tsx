import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  Crown,
  Download,
  Gift,
  Globe2,
  Inbox,
  LayoutDashboard,
  ListVideo,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type Lang = "tr" | "en";
type Section = "overview" | "iptv" | "giveaways" | "messages" | "plans" | "admin";

const copy = {
  tr: {
    dashboard: "Kontrol merkezi",
    overview: "Genel bakış",
    iptv: "IPTV listelerim",
    giveaways: "Çekilişler",
    messages: "DM kutusu",
    plans: "Paketler",
    admin: "Admin paneli",
    add: "IPTV ekle",
    search: "Ara",
    active: "aktif yayın",
    welcome: "Yayın akışını tek merkezde tut.",
    subtitle: "CRACKTEAM topluluğuna hoş geldin, Selbaba.",
    live: "Sistem canlı",
    recent: "Son eklenenler",
    seeAll: "Tümünü gör",
    giveawayTitle: "Bugünün çekilişi",
    giveawaySub: "Ultra üyeler arasından 3 kazanan seçilecek.",
    join: "Çekilişe katıl",
    ultra: "Ultra ayrıcalığı",
    ultraSub: "Bugünün ücretsiz IPTV bilgileri burada.",
    open: "Alanı aç",
    addTitle: "Yeni IPTV bağlantısı",
    m3u: "M3U dosyası / URL",
    credentials: "Kullanıcı adı + parola + link",
    paste: "M3U linkini yapıştır",
    username: "Kullanıcı adı",
    password: "Parola",
    link: "IPTV linki",
    cancel: "Vazgeç",
    save: "Listeyi kaydet",
    planCurrent: "Mevcut plan",
    upgrade: "Yükselt",
    messagesTitle: "Mesajlar",
  },
  en: {
    dashboard: "Control center",
    overview: "Overview",
    iptv: "My IPTV lists",
    giveaways: "Giveaways",
    messages: "DM inbox",
    plans: "Plans",
    admin: "Admin panel",
    add: "Add IPTV",
    search: "Search",
    active: "active streams",
    welcome: "Keep your stream in one place.",
    subtitle: "Welcome back to the CRACKTEAM community, Selbaba.",
    live: "System live",
    recent: "Recently added",
    seeAll: "See all",
    giveawayTitle: "Today's giveaway",
    giveawaySub: "3 winners will be selected from Ultra members.",
    join: "Join giveaway",
    ultra: "Ultra privilege",
    ultraSub: "Today's free IPTV details land here.",
    open: "Open area",
    addTitle: "New IPTV connection",
    m3u: "M3U file / URL",
    credentials: "Username + password + link",
    paste: "Paste M3U link",
    username: "Username",
    password: "Password",
    link: "IPTV link",
    cancel: "Cancel",
    save: "Save list",
    planCurrent: "Current plan",
    upgrade: "Upgrade",
    messagesTitle: "Messages",
  },
} as const;

const listData = [
  { name: "CRACKTEAM Sports HD", meta: "M3U • 1,248 kanal", status: "Canlı", color: "lime", time: "2 dk önce" },
  { name: "Hava'dan Yardım VIP", meta: "Xtream • 4,822 kanal", status: "Canlı", color: "violet", time: "18 dk önce" },
  { name: "Cinema Universe", meta: "M3U • 968 kanal", status: "Senkron bekliyor", color: "blue", time: "Dün" },
];

const plans = [
  { name: "Free", price: "0", unit: "TL / $0", note: "Reklamlı deneyim", color: "slate", features: ["M3U listesi ekle", "Temel yayın takibi", "Topluluk duyuruları"] },
  { name: "Pro", price: "50", unit: "TL / $1", note: "Az reklam, daha çok kontrol", color: "violet", features: ["Free'deki her şey", "Daha az reklam", "Öncelikli destek"] },
  { name: "Ultra", price: "100", unit: "TL / $2", note: "Tam topluluk ayrıcalığı", color: "lime", features: ["Pro'daki her şey", "Günlük ücretsiz IPTV", "Çekilişlere katılım"] },
];

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("tr");
  const [section, setSection] = useState<Section>("overview");
  const [modal, setModal] = useState(false);
  const [addMode, setAddMode] = useState<"m3u" | "credentials">("m3u");
  const [adminMode, setAdminMode] = useState(false);
  const [query, setQuery] = useState("");
  const t = copy[lang];
  const filteredLists = useMemo(() => listData.filter(item => item.name.toLowerCase().includes(query.toLowerCase())), [query]);

  const go = (next: Section) => { setSection(next); setAdminMode(next === "admin"); };
  const notify = (message: string) => toast.success(message, { description: lang === "tr" ? "CT Bot bildirim merkezine gönderildi." : "Sent to the CT Bot notification center." });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" onClick={() => go("overview")}><span>CT</span><i /></div>
        <div className="side-label">{t.dashboard}</div>
        <nav className="nav-stack">
          <NavItem icon={<LayoutDashboard size={18} />} label={t.overview} active={section === "overview"} onClick={() => go("overview")} />
          <NavItem icon={<ListVideo size={18} />} label={t.iptv} active={section === "iptv"} onClick={() => go("iptv")} count="3" />
          <NavItem icon={<Ticket size={18} />} label={t.giveaways} active={section === "giveaways"} onClick={() => go("giveaways")} count="1" />
          <NavItem icon={<MessageCircle size={18} />} label={t.messages} active={section === "messages"} onClick={() => go("messages")} count="2" />
        </nav>
        <div className="side-label lower">HESABIM</div>
        <nav className="nav-stack">
          <NavItem icon={<Crown size={18} />} label={t.plans} active={section === "plans"} onClick={() => go("plans")} />
          <NavItem icon={<ShieldCheck size={18} />} label={t.admin} active={section === "admin"} onClick={() => go("admin")} />
          <NavItem icon={<Settings2 size={18} />} label="Ayarlar" active={false} onClick={() => notify(lang === "tr" ? "Ayarlar yakında." : "Settings are coming soon.")} />
        </nav>
        <div className="sidebar-bottom">
          <div className="bot-card"><Bot size={17} /><div><strong>ct bot</strong><span>online • 24/7</span></div><span className="pulse-dot" /></div>
          <button className="profile-row"><div className="avatar">S</div><div><strong>Selbaba</strong><span>Ultra üye</span></div><MoreHorizontal size={16} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb"><span>CRACKTEAM</span><ChevronRight size={14} /><b>{adminMode ? t.admin : t.dashboard}</b></div>
          <div className="top-actions">
            <div className="searchbox"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`${t.search}...`} /></div>
            <button className="icon-button"><Bell size={18} /><em>3</em></button>
            <button className="lang-toggle" onClick={() => setLang(lang === "tr" ? "en" : "tr")}><Globe2 size={15} /><b>{lang.toUpperCase()}</b></button>
            <button className="mini-avatar">S</button>
          </div>
        </header>

        <div className="content-wrap">
          {adminMode ? <AdminPanel lang={lang} notify={notify} /> : section === "plans" ? <Plans lang={lang} onUpgrade={() => notify(lang === "tr" ? "Plan yükseltme talebi oluşturuldu." : "Upgrade request created.")} /> : section === "messages" ? <Messages lang={lang} /> : (
            <>
              <section className="hero-row">
                <div><div className="eyebrow"><span className="live-dot" /> {t.live} / 23 NOV 2026</div><h1>{t.welcome}</h1><p>{t.subtitle}</p></div>
                <button className="primary-button" onClick={() => setModal(true)}><Plus size={18} /> {t.add}</button>
              </section>

              <section className="metric-strip">
                <Metric icon={<Radio size={19} />} label="Toplam kanal" value="7,038" delta="+12.6%" />
                <Metric icon={<Activity size={19} />} label="Aktif yayın" value="2,184" delta="+8.4%" />
                <Metric icon={<Users size={19} />} label="Topluluk" value="12.8K" delta="+24.1%" />
                <Metric icon={<Zap size={19} />} label="Uptime" value="99.98%" delta="optimal" />
              </section>

              <div className="dashboard-grid">
                <section className="panel list-panel"><div className="panel-head"><div><span className="panel-kicker">YAYIN MERKEZİ</span><h2>{t.recent}</h2></div><button className="ghost-button" onClick={() => go("iptv")}>{t.seeAll} <ArrowUpRight size={15} /></button></div><div className="stream-list">{filteredLists.map((item, i) => <StreamRow key={item.name} item={item} index={i} onClick={() => notify(`${item.name} ${lang === "tr" ? "açıldı" : "opened"}.`)} />)}</div><div className="sync-line"><span><span className="tiny-live" /> Son senkronizasyon 2 dk önce</span><span>v2.4.1</span></div></section>
                <section className="panel giveaway-panel"><div className="panel-head"><div><span className="panel-kicker lime-text">ULTRA SAHNE</span><h2>{t.giveawayTitle}</h2></div><Gift size={23} className="lime-icon" /></div><div className="giveaway-art"><div className="ticket-orbit"><Ticket size={28} /></div><span>03 <small>KAZANAN</small></span><div className="orbit-line" /></div><p>{t.giveawaySub}</p><div className="giveaway-meta"><span><Users size={15} /> 842 katılımcı</span><span><Activity size={15} /> 06:42:18</span></div><button className="wide-button" onClick={() => notify(t.join)}><Sparkles size={16} /> {t.join}</button></section>
              </div>

              <section className="bottom-grid"><section className="panel ultra-panel"><div className="ultra-copy"><span className="panel-kicker lime-text"><Crown size={14} /> ULTRA'YA ÖZEL</span><h2>{t.ultra}</h2><p>{t.ultraSub}</p><button className="outline-lime" onClick={() => notify(t.open)}>{t.open} <ArrowUpRight size={15} /></button></div><div className="signal-graphic"><div className="signal-ring r1" /><div className="signal-ring r2" /><div className="signal-ring r3" /><Radio size={27} /></div></section><section className="panel bot-panel"><div className="bot-icon"><Bot size={22} /></div><div><span className="panel-kicker">CT BOT</span><h3>Her şey kontrol altında.</h3><p>Yeni link, çekiliş sonucu veya DM geldiğinde sana haber verir.</p></div><button className="circle-arrow" onClick={() => go("messages")}><ArrowUpRight size={17} /></button></section></section>
            </>
          )}
        </div>
      </main>

      {modal && <AddModal lang={lang} mode={addMode} setMode={setAddMode} onClose={() => setModal(false)} onSave={() => { setModal(false); notify(lang === "tr" ? "IPTV listen başarıyla eklendi." : "IPTV list added successfully."); }} />}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: string }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count && <em>{count}</em>}</button>; }
function Metric({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) { return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div><small>{delta}</small></div>; }
function StreamRow({ item, index, onClick }: { item: typeof listData[number]; index: number; onClick: () => void }) { return <button className="stream-row" onClick={onClick}><div className={`stream-logo ${item.color}`}>{index === 0 ? <Radio size={19} /> : index === 1 ? <Sparkles size={19} /> : <BarChart3 size={19} />}</div><div className="stream-info"><strong>{item.name}</strong><span>{item.meta}</span></div><Badge tone={item.status === "Canlı" ? "success" : "warning"}><span className={item.status === "Canlı" ? "tiny-live" : "tiny-wait"} />{item.status}</Badge><time>{item.time}</time><ChevronRight size={16} /></button>; }

function AddModal({ lang, mode, setMode, onClose, onSave }: { lang: Lang; mode: "m3u" | "credentials"; setMode: (m: "m3u" | "credentials") => void; onClose: () => void; onSave: () => void }) { const t = copy[lang]; const [m3uText, setM3uText] = useState(""); const detectedChannels = (m3uText.match(/#EXTINF/gi) || []).length; return <div className="modal-backdrop" onClick={onClose}><div className="modal-card" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="panel-kicker">YENİ BAĞLANTI</span><h2>{t.addTitle}</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><div className="mode-tabs"><button className={mode === "m3u" ? "selected" : ""} onClick={() => setMode("m3u")}><Upload size={16} /> {t.m3u}</button><button className={mode === "credentials" ? "selected" : ""} onClick={() => setMode("credentials")}><ShieldCheck size={16} /> {t.credentials}</button></div>{mode === "m3u" ? <><label className="field"><span>{t.paste}</span><textarea value={m3uText} onChange={e => setM3uText(e.target.value)} placeholder="https://ornek.com/playlist.m3u veya #EXTM3U" rows={4} /></label>{detectedChannels > 0 && <div className="detected-line"><Check size={14} /> {detectedChannels} kanal algılandı · liste hazır</div>}</> : <div className="field-grid"><label className="field"><span>{t.username}</span><input placeholder="selbaba" /></label><label className="field"><span>{t.password}</span><input type="password" placeholder="••••••••" /></label><label className="field full"><span>{t.link}</span><input placeholder="https://provider.example/xtream" /></label></div>}<div className="modal-footer"><span><ShieldCheck size={14} /> Bilgilerin şifreli saklanır.</span><div><button className="ghost-button" onClick={onClose}>{t.cancel}</button><button className="primary-button" onClick={onSave}><Check size={16} /> {t.save}</button></div></div></div></div>; }

function Plans({ lang, onUpgrade }: { lang: Lang; onUpgrade: () => void }) { const t = copy[lang]; return <div className="inner-page"><div className="page-title"><div><span className="eyebrow">HESABIN / PLANLAR</span><h1>Yayın deneyimini büyüt.</h1><p>İhtiyacına göre seç, istediğin zaman değiştir.</p></div><Badge tone="success">Ultra aktif</Badge></div><div className="plans-grid">{plans.map(plan => <div className={`plan-card ${plan.color}`} key={plan.name}>{plan.name === "Ultra" && <div className="popular">EN POPÜLER</div>}<div className="plan-top"><span className="plan-name">{plan.name}</span>{plan.name === "Ultra" ? <Crown size={18} /> : <Zap size={18} />}</div><div className="plan-price"><strong>{plan.price}</strong><span>{plan.unit}</span></div><p>{plan.note}</p><div className="plan-features">{plan.features.map(f => <span key={f}><Check size={14} /> {f}</span>)}</div><button className={plan.name === "Ultra" ? "wide-button" : "outline-lime"} onClick={onUpgrade}>{plan.name === "Ultra" ? t.planCurrent : t.upgrade}</button></div>)}</div></div>; }

function Messages({ lang }: { lang: Lang }) { const t = copy[lang]; return <div className="inner-page"><div className="page-title"><div><span className="eyebrow">TOPLULUK / DM</span><h1>{t.messagesTitle}</h1><p>ct bot ve admin mesajlarını tek akışta gör.</p></div><button className="primary-button"><Send size={16} /> Yeni mesaj</button></div><div className="message-layout"><div className="conversation-list"><div className="conversation active"><div className="bot-icon"><Bot size={18} /></div><div><strong>ct bot</strong><span>Çekiliş sonucu hazırlandı.</span></div><time>2 dk</time></div><div className="conversation"><div className="avatar small">A</div><div><strong>Admin</strong><span>Ultra IPTV linkin gönderildi.</span></div><time>1 sa</time></div><div className="conversation"><div className="avatar small">C</div><div><strong>CRACKTEAM destek</strong><span>Hoş geldin Selbaba.</span></div><time>Dün</time></div></div><div className="chat-window"><div className="chat-head"><div className="bot-icon"><Bot size={18} /></div><div><strong>ct bot</strong><span><span className="tiny-live" /> online</span></div></div><div className="chat-body"><div className="bubble bot">Bugünkü çekiliş tamamlandı. Sonuçları admin paneline ilettim.</div><div className="bubble user">Teşekkürler, Ultra linkleri de bekliyorum.</div><div className="bubble bot">Tamamdır. Yeni ücretsiz IPTV paylaşımı geldiğinde burada göreceksin.</div></div><div className="chat-input"><input placeholder="Mesajını yaz..." /><button><Send size={16} /></button></div></div></div></div>; }

function AdminPanel({ lang, notify }: { lang: Lang; notify: (message: string) => void }) { return <div className="inner-page"><div className="page-title"><div><span className="eyebrow"><ShieldCheck size={14} /> ADMIN / CT BOT</span><h1>Yönetim paneli</h1><p>Çekiliş, ücretsiz IPTV ve topluluk akışını buradan yönet.</p></div><Badge tone="success">Admin yetkisi aktif</Badge></div><div className="admin-grid"><div className="admin-card"><div className="admin-card-head"><Ticket size={19} /><strong>Yeni çekiliş başlat</strong></div><label className="field"><span>Çekiliş adı</span><input placeholder="Haftanın Ultra sürprizi" /></label><div className="field-grid"><label className="field"><span>Kazanan sayısı</span><input value="3" readOnly /></label><label className="field"><span>Süre</span><input value="24 saat" readOnly /></label></div><button className="wide-button" onClick={() => notify("Çekiliş yayınlandı.")}><Sparkles size={16} /> Çekilişi yayınla</button></div><div className="admin-card"><div className="admin-card-head"><Radio size={19} /><strong>Ücretsiz IPTV paylaş</strong></div><label className="field"><span>Ultra duyuru başlığı</span><input placeholder="Bugünün linki" /></label><label className="field"><span>M3U / Xtream bağlantısı</span><textarea rows={3} placeholder="Linki buraya yapıştır..." /></label><button className="outline-lime wide" onClick={() => notify("Ultra ücretsiz IPTV paylaşımı yayınlandı.")}><Send size={16} /> Ultra'ya gönder</button></div><div className="admin-card wide-card"><div className="admin-card-head"><Bot size={19} /><strong>Telegram / CT Bot akışı</strong><Badge tone="success">Hazır</Badge></div><div className="rule-row"><span><span className="tiny-live" /> Kanal dinleme kuralı</span><code>@iptv</code><span className="muted">havadanyardim</span><button className="circle-arrow" onClick={() => notify("Telegram kuralı düzenleme ekranı açıldı.")}><Settings2 size={15} /></button></div><div className="rule-row"><span><Check size={15} className="lime-text" /> Son çekiliş sonucu</span><span className="muted">3 kazanan admin DM'ine gönderildi</span><button className="circle-arrow" onClick={() => notify("Sonuç raporu ct bot üzerinden gönderildi.")}><Send size={15} /></button></div></div></div></div>; }
