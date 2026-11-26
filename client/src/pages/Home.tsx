import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Crown,
  Download,
  Gift,
  Globe2,
  Inbox,
  LayoutDashboard,
  ListVideo,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Plus,
  Radio,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Newspaper,
  Gamepad2,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import Hls from "hls.js";
import mpegts from "mpegts.js";

type Lang = "tr" | "en";
type Section = "overview" | "iptv" | "giveaways" | "messages" | "plans" | "settings" | "admin" | "steam" | "mail" | "film" | "spor" | "haber";

const copy = {
  tr: {
    dashboard: "Kontrol merkezi",
    overview: "Genel bakış",
    iptv: "IPTV listelerim",
    giveaways: "Çekilişler",
    messages: "DM kutusu",
    plans: "Paketler",
    settings: "Ayarlar",
    admin: "Admin paneli",
    add: "IPTV ekle",
    search: "Ara",
    active: "aktif yayın",
    welcome: "Yayın akışını tek merkezde tut.",
    subtitle: "Telegram’dan gelen içerikleri ve kendi listelerini tek merkezde yönet.",
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
    settings: "Settings",
    admin: "Admin panel",
    add: "Add IPTV",
    search: "Search",
    active: "active streams",
    welcome: "Keep your stream in one place.",
    subtitle: "Manage Telegram content and your own lists in one place.",
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

type ContentItem = { id?: number; title?: string | null; content?: string | null; category?: string; createdAt?: string | Date | null };
type IptvAccount = { username: string; plan: string };
type Profile = { username: string; plan: string; displayName: string; email: string; avatarUrl: string; language: Lang };
type HouseAd = { eyebrow: string; title: string; body: string; action: string; href: string };
type UserChannel = { name: string; url: string; group?: string; logo?: string };
type UserIptvList = { id: number; name: string; sourceType: "m3u" | "credentials"; channels: UserChannel[]; createdAt?: string };

const plans = [
  { name: "Free", price: "0", unit: "TL / $0", note: "Reklamlı deneyim", color: "slate", features: ["M3U listesi ekle", "Temel yayın takibi", "Topluluk duyuruları"] },
  { name: "Pro", price: "50", unit: "TL / $1", note: "Az reklam, daha çok kontrol", color: "violet", features: ["Free'deki her şey", "Steam, Mail, Film, Spor ve Haber sekmeleri", "Pro Telegram içerik akışı", "Daha seyrek reklam", "Öncelikli destek"] },
  { name: "Ultra", price: "100", unit: "TL / $2", note: "Tam topluluk ayrıcalığı", color: "lime", features: ["Pro'daki her şey", "Reklamsız kullanım", "Günlük ücretsiz IPTV duyuruları", "Çekilişlere katılım", "Ultra topluluk ayrıcalıkları"] },
];
const houseAds: HouseAd[] = [
  { eyebrow: "CRACKTEAM / ULTRA", title: "Ultra’ya geç, ayrıcalıkları aç.", body: "Günlük ücretsiz IPTV duyuruları, çekilişlere katılım ve Ultra topluluk akışına eriş.", action: "Ultra’yı incele", href: "#plans" },
  { eyebrow: "TELEGRAM / HAVADAN YARDIM", title: "Yeni içerikleri ilk sen gör.", body: "@havadanyardim kanalındaki gerçek duyuruları takip et; etiketli içerikler CRACKTEAM İPTV’ye otomatik aktarılır.", action: "Telegram kanalını aç", href: "https://t.me/havadanyardim" },
  { eyebrow: "FREE → ULTRA", title: "Neden Ultra’ya katılmalısın?", body: "Free reklamlı temel deneyim sunar. Ultra’da günlük IPTV paylaşımları, çekilişler ve özel topluluk avantajları açılır.", action: "Paketleri gör", href: "#plans" },
  { eyebrow: "CRACKTEAM DUYURU", title: "Bot üzerinden kolay başvuru.", body: "Ultra veya Pro başvurusu için @ct_bot’a /paket Ultra Ahmet formatında yaz. Parolanı asla gönderme.", action: "Botu aç", href: "https://t.me/ct_bot" },
];

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Lang>("tr");
  const [section, setSection] = useState<Section>("overview");
  const [modal, setModal] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
  const [addMode, setAddMode] = useState<"m3u" | "credentials">("m3u");
  const [adminMode, setAdminMode] = useState(false);
  const [query, setQuery] = useState("");
  const [iptvItems, setIptvItems] = useState<ContentItem[]>([]);
  const [iptvAccount, setIptvAccount] = useState<IptvAccount | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myLists, setMyLists] = useState<UserIptvList[]>([]);
  const t = copy[lang];
  const filteredLists = useMemo(() => iptvItems.filter(item => `${item.title ?? ""} ${item.content ?? ""}`.toLowerCase().includes(query.toLowerCase())), [iptvItems, query]);
  const isAdmin = user?.role === "admin";
  const currentPlan = iptvAccount?.plan ?? "free";
  const proSections = ["steam", "mail", "film", "spor", "haber"];

  useEffect(() => {
    const sessionToken = localStorage.getItem("ct_iptv_session");
    fetch("/api/auth/me", { headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined })
      .then(response => response.ok ? response.json() : null)
      .then(payload => setIptvAccount(payload?.user ?? null))
      .catch(() => setIptvAccount(null));
    if (sessionToken) fetch("/api/auth/profile", { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { if (payload?.profile) setProfile(payload.profile); })
      .catch(() => setProfile(null));
    fetch("/api/content/iptv")
      .then(response => response.ok ? response.json() : null)
      .then(payload => setIptvItems(Array.isArray(payload?.items) ? payload.items : []))
      .catch(() => setIptvItems([]));
    loadMyLists();
  }, []);
  const loadMyLists = () => {
    const sessionToken = localStorage.getItem("ct_iptv_session");
    if (!sessionToken) return setMyLists([]);
    fetch("/api/iptv/lists", { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(response => response.ok ? response.json() : null)
      .then(payload => setMyLists(Array.isArray(payload?.lists) ? payload.lists : []))
      .catch(() => setMyLists([]));
  };

  const go = (next: Section) => {
    if (next === "admin" && !isAdmin) {
      notify(lang === "tr" ? "Admin yetkisi olan hesapla giriş yapmalısın." : "Sign in with an admin account to open this area.");
      return;
    }
    if (proSections.includes(next) && !["pro", "ultra", "ultra_trial"].includes(currentPlan)) {
      notify(lang === "tr" ? "Bu alan Pro ve Ultra paketlere özeldir." : "This area is available on Pro and Ultra plans.");
      setSection("plans");
      return;
    }
    setSection(next); setAdminMode(next === "admin");
  };
  const notify = (message: string) => toast.success(message, { description: lang === "tr" ? "CT Bot bildirim merkezine gönderildi." : "Sent to the CT Bot notification center." });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" onClick={() => go("overview")}><span>CT</span><i /></div>
        <div className="side-label">{t.dashboard}</div>
        <nav className="nav-stack">
          <NavItem icon={<LayoutDashboard size={18} />} label={t.overview} active={section === "overview"} onClick={() => go("overview")} />
          <NavItem icon={<ListVideo size={18} />} label={t.iptv} active={section === "iptv"} onClick={() => go("iptv")} />
          <NavItem icon={<Ticket size={18} />} label={t.giveaways} active={section === "giveaways"} onClick={() => go("giveaways")} />
          <NavItem icon={<MessageCircle size={18} />} label={t.messages} active={section === "messages"} onClick={() => go("messages")} />
          <div className="pro-nav-label">PRO SEKME</div>
          <NavItem icon={<Gamepad2 size={18} />} label="Steam" active={section === "steam"} onClick={() => go("steam")} />
          <NavItem icon={<Mail size={18} />} label="Mail" active={section === "mail"} onClick={() => go("mail")} />
          <NavItem icon={<Clapperboard size={18} />} label="Film" active={section === "film"} onClick={() => go("film")} />
          <NavItem icon={<Trophy size={18} />} label="Spor" active={section === "spor"} onClick={() => go("spor")} />
          <NavItem icon={<Newspaper size={18} />} label="Haber" active={section === "haber"} onClick={() => go("haber")} />
        </nav>
        <div className="side-label lower">HESABIM</div>
        <nav className="nav-stack">
          <NavItem icon={<Crown size={18} />} label={t.plans} active={section === "plans"} onClick={() => go("plans")} />
          {isAdmin && <NavItem icon={<ShieldCheck size={18} />} label={t.admin} active={section === "admin"} onClick={() => go("admin")} />}
          <NavItem icon={<Settings2 size={18} />} label={t.settings} active={section === "settings"} onClick={() => go("settings")} />
        </nav>
        <div className="sidebar-bottom">
          <div className="bot-card"><Bot size={17} /><div><strong>ct bot</strong><span>durum doğrulanıyor</span></div><span className="pulse-dot" /></div>
          <button className="profile-row" onClick={() => (isAuthenticated || iptvAccount) ? go("settings") : setAuthModal("login")}>{profile?.avatarUrl ? <img className="avatar avatar-image" src={profile.avatarUrl} alt="Avatar" /> : <div className="avatar">{(profile?.displayName || iptvAccount?.username || user?.name || "?")[0].toUpperCase()}</div>}<div><strong>{profile?.displayName || iptvAccount?.username || user?.name || (isAuthenticated ? "Hesap" : "Giriş yapılmadı")}</strong><span>{iptvAccount?.plan ?? user?.role ?? "Giriş / kayıt"}</span></div><MoreHorizontal size={16} /></button>
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
          {adminMode ? <AdminPanel lang={lang} notify={notify} /> : section === "settings" ? <SettingsPage lang={lang} profile={profile ?? (iptvAccount ? { username: iptvAccount.username, plan: iptvAccount.plan, displayName: "", email: "", avatarUrl: "", language: lang } : null)} onSaved={setProfile} onLanguageChange={setLang} onLogout={() => { localStorage.removeItem("ct_iptv_session"); setIptvAccount(null); setProfile(null); setSection("overview"); setAuthModal("login"); }} /> : section === "plans" ? <Plans lang={lang} currentPlan={currentPlan} onUpgrade={() => notify(lang === "tr" ? "Plan yükseltme talebi oluşturuldu." : "Upgrade request created")} /> : section === "messages" ? <Messages lang={lang} /> : section === "iptv" ? <IptvPage lang={lang} telegramItems={iptvItems} lists={myLists} onAdd={() => setModal(true)} /> : ["steam", "mail", "film", "spor", "haber"].includes(section) ? <ProSection lang={lang} plan={currentPlan} category={section as "steam" | "mail" | "film" | "spor" | "haber"} /> : (
            <>
              <section className="hero-row">
                <div><div className="eyebrow"><span className="live-dot" /> {t.live} / 23 NOV 2026</div><h1>{t.welcome}</h1><p>{t.subtitle}</p></div>
                <button className="primary-button" onClick={() => setModal(true)}><Plus size={18} /> {t.add}</button>
              </section>

              <section className="metric-strip">
                <Metric icon={<Radio size={19} />} label="Telegram IPTV içeriği" value={String(iptvItems.length)} delta="gerçek veri" />
                <Metric icon={<Activity size={19} />} label="Aktif yayın" value="—" delta="veri yok" />
                <Metric icon={<Users size={19} />} label="Topluluk" value="—" delta="veri yok" />
                <Metric icon={<Zap size={19} />} label="Uptime" value="—" delta="ölçülmüyor" />
              </section>
              <PlanSpotlight plan={currentPlan} onPlans={() => go("plans")} onPro={() => go("steam")} />

              <div className="dashboard-grid">
                <section className="panel list-panel"><div className="panel-head"><div><span className="panel-kicker">YAYIN MERKEZİ</span><h2>{t.recent}</h2></div><button className="ghost-button" onClick={() => go("iptv")}>{t.seeAll} <ArrowUpRight size={15} /></button></div><div className="stream-list">{filteredLists.length ? filteredLists.map((item, i) => <StreamRow key={item.id ?? i} item={item} index={i} onClick={() => undefined} />) : <div className="content-placeholder"><Radio size={18} /><span>Henüz Telegram IPTV içeriği yok.</span></div>}</div><div className="sync-line"><span>Telegram’dan gelen gerçek kayıtlar gösterilir</span><span>—</span></div></section>
                <section className="panel giveaway-panel"><div className="panel-head"><div><span className="panel-kicker lime-text">ÇEKİLİŞLER</span><h2>Henüz çekiliş yok</h2></div><Gift size={23} className="lime-icon" /></div><p>Aktif bir çekiliş oluşturulduğunda burada görünür. Uydurma katılımcı ve sayaç gösterilmiyor.</p><button className="outline-lime" onClick={() => go("giveaways")}><Ticket size={16} /> Çekilişleri aç</button></section>
              </div>

              <section className="bottom-grid"><section className="panel ultra-panel"><div className="ultra-copy"><span className="panel-kicker lime-text"><Crown size={14} /> ULTRA'YA ÖZEL</span><h2>{t.ultra}</h2><p>{t.ultraSub}</p><button className="outline-lime" onClick={() => notify(t.open)}>{t.open} <ArrowUpRight size={15} /></button></div><div className="signal-graphic"><div className="signal-ring r1" /><div className="signal-ring r2" /><div className="signal-ring r3" /><Radio size={27} /></div></section><section className="panel bot-panel"><div className="bot-icon"><Bot size={22} /></div><div><span className="panel-kicker">CT BOT</span><h3>Her şey kontrol altında.</h3><p>Yeni link, çekiliş sonucu veya DM geldiğinde sana haber verir.</p></div><button className="circle-arrow" onClick={() => go("messages")}><ArrowUpRight size={17} /></button></section></section>
            </>
          )}
        </div>
      </main>

      {modal && <AddModal lang={lang} mode={addMode} setMode={setAddMode} onClose={() => setModal(false)} onSaved={() => { setModal(false); loadMyLists(); notify(lang === "tr" ? "IPTV listen ve kanallar kaydedildi." : "IPTV list and channels saved."); }} />}
      {authModal && <AuthModal mode={authModal} onModeChange={setAuthModal} onClose={() => setAuthModal(null)} />}
      <HouseAdOverlay plan={iptvAccount?.plan ?? "free"} onPlans={() => { setSection("plans"); setAdminMode(false); }} />
    </div>
  );
}

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: string }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count && <em>{count}</em>}</button>; }
function Metric({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) { return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div><small>{delta}</small></div>; }
function StreamRow({ item, index, onClick }: { item: ContentItem; index: number; onClick: () => void }) { const title = item.title || `Telegram ${item.category ?? "IPTV"} içeriği`; const meta = item.content ? item.content.slice(0, 80) : "Telegram kaydı"; return <button className="stream-row" onClick={onClick}><div className={`stream-logo ${index % 2 ? "violet" : "lime"}`}><Radio size={19} /></div><div className="stream-info"><strong>{title}</strong><span>{meta}</span></div><Badge tone="success"><span className="tiny-live" />Alındı</Badge><time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("tr-TR") : "—"}</time><ChevronRight size={16} /></button>; }
function PlanSpotlight({ plan, onPlans, onPro }: { plan: string; onPlans: () => void; onPro: () => void }) {
  const normalized = plan.replace("_trial", "");
  const isPro = ["pro", "ultra"].includes(normalized);
  const isUltra = normalized === "ultra";
  const title = isUltra ? "Ultra avantajların açık" : isPro ? "Pro özelliklerin açık" : "Free planın aktif";
  const subtitle = isUltra ? "Reklamsız kullanım ve Ultra topluluk ayrıcalıkları hesabına bağlı." : isPro ? "Özel Telegram sekmeleri ve daha seyrek reklam deneyimi hesabında aktif." : "Temel IPTV deneyimin hazır. Daha fazla içerik için planını yükseltebilirsin.";
  const features = isUltra ? ["Reklamsız kullanım", "Günlük ücretsiz IPTV", "Çekiliş katılımı"] : isPro ? ["Steam / Mail / Film / Spor / Haber", "Pro Telegram akışı", "Daha seyrek reklam"] : ["M3U ve provider listeleri", "Temel IPTV akışı", "Topluluk duyuruları"];
  return <section className={`plan-spotlight ${isUltra ? "ultra" : isPro ? "pro" : "free"}`}><div className="plan-spotlight-icon">{isUltra ? <Crown size={22} /> : isPro ? <Sparkles size={22} /> : <Zap size={22} />}</div><div className="plan-spotlight-copy"><div className="plan-spotlight-kicker">HESABIN / {normalized.toUpperCase()} <span>AKTİF</span></div><h2>{title}</h2><p>{subtitle}</p><div className="plan-spotlight-features">{features.map(feature => <span key={feature}><Check size={13} /> {feature}</span>)}</div></div><div className="plan-spotlight-actions">{!isUltra && <button className="outline-lime" onClick={onPlans}>{isPro ? "Ultra’yı incele" : "Pro özelliklerini aç"}</button>}{isPro && !isUltra && <button className="ghost-button" onClick={onPro}>Pro akışına git <ArrowUpRight size={14} /></button>}{isUltra && <Badge tone="success"><span className="tiny-live" /> Ayrıcalıklar açık</Badge>}</div></section>;
}
function HouseAdOverlay({ plan, onPlans }: { plan: string; onPlans: () => void }) {
  const [ad, setAd] = useState<HouseAd | null>(null);
  const [seconds, setSeconds] = useState(20);
  useEffect(() => {
    if (plan === "ultra" || plan === "ultra_trial") return;
    const intervalMs = plan === "pro" ? 180000 : 90000;
    const firstDelay = plan === "pro" ? 25000 : 10000;
    const show = () => {
      const last = Number(sessionStorage.getItem("ct_last_house_ad") ?? "0");
      if (Date.now() - last < intervalMs - 1000) return;
      const next = houseAds[Math.floor(Math.random() * houseAds.length)];
      sessionStorage.setItem("ct_last_house_ad", String(Date.now()));
      setSeconds(20); setAd(next);
    };
    const first = window.setTimeout(show, firstDelay);
    const timer = window.setInterval(show, intervalMs);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [plan]);
  useEffect(() => { if (!ad || seconds <= 0) return; const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [ad, seconds]);
  if (!ad || plan === "ultra" || plan === "ultra_trial") return null;
  const open = () => { if (ad.href === "#plans") onPlans(); else window.open(ad.href, "_blank", "noopener,noreferrer"); };
  return <div className="house-ad-backdrop"><div className="house-ad-card" role="dialog" aria-modal="true"><div className="house-ad-top"><span className="house-ad-label">REKLAM / CRACKTEAM</span><span className="house-ad-timer">{seconds > 0 ? `${seconds} sn` : "Hazır"}</span></div><div className="house-ad-orb"><Sparkles size={28} /></div><span className="panel-kicker lime-text">{ad.eyebrow}</span><h2>{ad.title}</h2><p>{ad.body}</p><button className="wide-button" onClick={open}>{ad.action} <ArrowUpRight size={16} /></button><button className="house-ad-close" disabled={seconds > 0} onClick={() => setAd(null)}>{seconds > 0 ? `Kapatmak için ${seconds} saniye bekle` : "Reklamı kapat"}</button></div></div>;
}
function SettingsPage({ lang, profile, onSaved, onLanguageChange, onLogout }: { lang: Lang; profile: Profile | null; onSaved: (profile: Profile) => void; onLanguageChange: (lang: Lang) => void; onLogout: () => void }) {
  const tr = lang === "tr";
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [language, setLanguage] = useState<Lang>(profile?.language ?? lang);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setDisplayName(profile?.displayName ?? ""); setEmail(profile?.email ?? ""); setAvatarUrl(profile?.avatarUrl ?? ""); setLanguage(profile?.language ?? lang); }, [profile, lang]);
  const chooseAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage(tr ? "Lütfen bir resim seç." : "Please choose an image.");
    if (file.size > 500 * 1024) return setMessage(tr ? "Avatar 500 KB altında olmalı." : "Avatar must be under 500 KB.");
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const token = localStorage.getItem("ct_iptv_session");
      const response = await fetch("/api/auth/profile", { method: "PUT", headers: { "content-type": "application/json", Authorization: `Bearer ${token ?? ""}` }, body: JSON.stringify({ displayName, email, avatarUrl, language }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Profil kaydedilemedi");
      onSaved(payload.profile); onLanguageChange(language); setMessage(tr ? "Profil ayarların kaydedildi." : "Your profile settings were saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Profil kaydedilemedi"); } finally { setBusy(false); }
  };
  return <div className="inner-page"><div className="page-title"><div><span className="eyebrow"><Settings2 size={14} /> {tr ? "HESAP / AYARLAR" : "ACCOUNT / SETTINGS"}</span><h1>{tr ? "Profilin" : "Your profile"}</h1><p>{tr ? "Hesap bilgilerini ve uygulama dilini buradan yönet." : "Manage your account details and app language here."}</p></div><Badge tone="default">{profile?.plan ?? "free"}</Badge></div><div className="admin-grid"><section className="admin-card"><div className="admin-card-head"><Settings2 size={18} /><strong>{tr ? "Profil bilgileri" : "Profile details"}</strong></div><div className="avatar-editor">{avatarUrl ? <img className="avatar-large avatar-image" src={avatarUrl} alt="Avatar önizleme" /> : <div className="avatar-large">{(displayName || profile?.username || "?")[0].toUpperCase()}</div>}<label className="outline-lime avatar-picker">{tr ? "Avatar seç" : "Choose avatar"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} /></label><span className="muted">PNG, JPG veya WEBP · 500 KB</span></div><label className="field"><span>{tr ? "Kullanıcı adı" : "Username"}</span><input value={profile?.username ?? ""} readOnly /></label><label className="field"><span>{tr ? "Görünen ad" : "Display name"}</span><input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={tr ? "Adın" : "Your name"} maxLength={80} /></label><label className="field"><span>E-posta</span><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="ornek@mail.com" /></label></section><section className="admin-card"><div className="admin-card-head"><Globe2 size={18} /><strong>{tr ? "Tercihler" : "Preferences"}</strong></div><label className="field"><span>{tr ? "Uygulama dili" : "App language"}</span><select value={language} onChange={e => setLanguage(e.target.value as Lang)}><option value="tr">Türkçe</option><option value="en">English</option></select></label><div className="rule-row"><span>{tr ? "Mevcut paket" : "Current plan"}</span><code>{profile?.plan ?? "free"}</code></div><div className="rule-row"><span>{tr ? "Parola" : "Password"}</span><span className="muted">{tr ? "Değiştirmek için yeni giriş akışı kullanılacak." : "Use the sign-in flow to change it."}</span></div></section></div>{message && <div className="detected-line">{message}</div>}<div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, borderTop: 0 }}><span><ShieldCheck size={14} /> {tr ? "Profil bilgilerin hesabına bağlı saklanır." : "Your profile is stored with your account."}</span><div><button className="ghost-button" onClick={onLogout}>{tr ? "Çıkış yap" : "Sign out"}</button><button className="primary-button" disabled={busy} onClick={save}>{busy ? (tr ? "Kaydediliyor..." : "Saving...") : (tr ? "Değişiklikleri kaydet" : "Save changes")}</button></div></div></div>;
}
function IptvPage({ lang, telegramItems, lists, onAdd }: { lang: Lang; telegramItems: ContentItem[]; lists: UserIptvList[]; onAdd: () => void }) {
  const tr = lang === "tr";
  const [openListId, setOpenListId] = useState<number | null>(lists[0]?.id ?? null);
  const [selectedChannel, setSelectedChannel] = useState<UserChannel | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const activeList = lists.find(list => list.id === openListId) ?? null;
  useEffect(() => { if (openListId && !lists.some(list => list.id === openListId)) setOpenListId(lists[0]?.id ?? null); }, [lists, openListId]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    hlsRef.current?.destroy(); hlsRef.current = null;
    mpegtsRef.current?.destroy(); mpegtsRef.current = null;
    video.removeAttribute("src"); video.load(); setVideoReady(false);
    if (!selectedChannel) return;
    const url = selectedChannel.url;
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hlsRef.current = hls; hls.loadSource(url); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => undefined));
    } else if (cleanUrl.endsWith(".m3u8") && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url; video.play().catch(() => undefined);
    } else if (!/\.(mp4|webm|ogg|m4v|mov)(\?|$)/i.test(url) && mpegts.isSupported()) {
      const player = mpegts.createPlayer({ type: "mpegts", url, isLive: true, cors: true }, { enableWorker: true, lazyLoad: false });
      mpegtsRef.current = player; player.attachMediaElement(video); player.load(); Promise.resolve(player.play()).catch(() => undefined);
    } else {
      video.src = url; video.play().catch(() => undefined);
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; mpegtsRef.current?.destroy(); mpegtsRef.current = null; };
  }, [selectedChannel]);
  const toggleFullscreen = async () => { if (!playerRef.current) return; if (document.fullscreenElement) { await document.exitFullscreen(); setFullscreen(false); } else { await playerRef.current.requestFullscreen(); setFullscreen(true); } };
  const chooseChannel = (channel: UserChannel) => { setSelectedChannel(channel); setVideoReady(false); };
  return <div className="inner-page"><div className="page-title"><div><span className="eyebrow"><ListVideo size={14} /> IPTV</span><h1>{tr ? "IPTV listelerim" : "My IPTV lists"}</h1><p>{tr ? "M3U veya kullanıcı adı, parola ve link ile eklediğin gerçek kanallar." : "Your real channels from M3U or provider credentials."}</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> {tr ? "IPTV ekle" : "Add IPTV"}</button></div><div ref={playerRef} className={`iptv-player ${fullscreen ? "is-fullscreen" : ""}`}><div className="player-topbar"><span><Radio size={14} /> {selectedChannel?.name || (tr ? "Kanal seçilmedi" : "No channel selected")}</span><button className="player-fullscreen" onClick={toggleFullscreen} aria-label={fullscreen ? "Tam ekrandan çık" : "Tam ekran"}>{fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></div>{selectedChannel && <video ref={videoRef} className="iptv-video" controls autoPlay playsInline onCanPlay={() => setVideoReady(true)} onLoadedData={() => setVideoReady(true)} onError={() => setVideoReady(false)} />}{!videoReady && <div className="no-signal"><span>NO SIGNAL</span><small>{selectedChannel ? (tr ? "Yayın yüklenemedi veya format desteklenmiyor" : "Stream unavailable or format unsupported") : (tr ? "İzlemek için bir kanal seç" : "Select a channel to watch")}</small></div>}</div><div className="playlist-layout"><div className="content-placeholder-grid">{lists.length ? lists.map(list => <button className={`playlist-card ${openListId === list.id ? "selected" : ""}`} key={list.id} onClick={() => { setOpenListId(list.id); setSelectedChannel(null); setVideoReady(false); }}><div className="placeholder-icon"><Radio size={18} /></div><div><strong>{list.name}</strong><span>{list.channels.length} kanal · {list.sourceType === "m3u" ? "M3U" : "Xtream"}</span><small>{tr ? "Oynatma listesini aç" : "Open playlist"} <ChevronRight size={13} /></small></div></button>) : <div className="content-placeholder"><Radio size={18} /><div><strong>{tr ? "Henüz kişisel IPTV listen yok" : "No personal IPTV lists yet"}</strong><span>{tr ? "IPTV ekle düğmesinden M3U veya sağlayıcı bilgilerini kaydet." : "Use Add IPTV to save an M3U list or provider details."}</span></div></div>}</div>{activeList && <section className="panel playlist-detail"><div className="panel-head"><div><span className="panel-kicker lime-text">OYNATMA LİSTESİ</span><h2>{activeList.name}</h2></div><Badge tone="success">{activeList.channels.length} kanal</Badge></div><div className="channel-list">{activeList.channels.length ? activeList.channels.map((channel, index) => <div className="channel-row" key={`${activeList.id}-${channel.url}-${index}`}><div className="channel-logo">{channel.logo ? <img src={channel.logo} alt="" /> : <Radio size={15} />}</div><div><strong>{channel.name}</strong><span>{channel.group || (tr ? "Canlı yayın" : "Live stream")}</span></div><button className="channel-open" onClick={() => chooseChannel(channel)}>{tr ? "Aç" : "Open"} <ArrowUpRight size={14} /></button></div>) : <div className="content-placeholder"><Radio size={18} /><span>{tr ? "Bu listede kanal bulunamadı." : "No channels found in this playlist."}</span></div>}</div></section>}</div><div className="page-title" style={{ marginTop: 36 }}><div><span className="eyebrow"><Bot size={14} /> TELEGRAM</span><h2>{tr ? "Telegram IPTV içerikleri" : "Telegram IPTV content"}</h2></div></div><div className="content-placeholder-grid">{telegramItems.length ? telegramItems.map((item, index) => <div className="content-placeholder" key={item.id ?? index}><div className="placeholder-icon"><Radio size={18} /></div><div><strong>{item.title || `@iptv Telegram içeriği`}</strong><span>{item.content || "İçerik metni yok"}</span></div></div>) : <div className="content-placeholder"><Radio size={18} /><div><strong>{tr ? "Henüz Telegram IPTV içeriği yok" : "No Telegram IPTV content yet"}</strong><span>{tr ? "@iptv etiketiyle gelen mesajlar burada görünecek." : "Posts tagged @iptv will appear here."}</span></div></div>}</div></div>;
}
function AddModal({ lang, mode, setMode, onClose, onSaved }: { lang: Lang; mode: "m3u" | "credentials"; setMode: (m: "m3u" | "credentials") => void; onClose: () => void; onSaved: () => void }) {
  const t = copy[lang]; const [m3uText, setM3uText] = useState(""); const [providerUsername, setProviderUsername] = useState(""); const [providerPassword, setProviderPassword] = useState(""); const [providerLink, setProviderLink] = useState(""); const [name, setName] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const detectedChannels = (m3uText.match(/#EXTINF/gi) || []).length;
  const save = async () => { setBusy(true); setError(""); try { const token = localStorage.getItem("ct_iptv_session"); if (!token) throw new Error("Önce IPTV hesabına giriş yapmalısın."); const body = mode === "m3u" ? { sourceType: "m3u", name, m3uText } : { sourceType: "credentials", name, providerUsername, providerPassword, providerLink }; const response = await fetch("/api/iptv/lists", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "IPTV listesi kaydedilemedi"); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "IPTV listesi kaydedilemedi"); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="panel-kicker">YENİ BAĞLANTI</span><h2>{t.addTitle}</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><div className="mode-tabs"><button className={mode === "m3u" ? "selected" : ""} onClick={() => setMode("m3u")}><Upload size={16} /> {t.m3u}</button><button className={mode === "credentials" ? "selected" : ""} onClick={() => setMode("credentials")}><ShieldCheck size={16} /> {t.credentials}</button></div><label className="field"><span>Liste adı</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Benim IPTV" /></label>{mode === "m3u" ? <><label className="field"><span>{t.paste}</span><textarea value={m3uText} onChange={e => setM3uText(e.target.value)} placeholder="https://ornek.com/playlist.m3u veya #EXTM3U" rows={5} /></label>{detectedChannels > 0 && <div className="detected-line"><Check size={14} /> {detectedChannels} kanal bulundu</div>}</> : <div className="field-grid"><label className="field"><span>{t.username}</span><input value={providerUsername} onChange={e => setProviderUsername(e.target.value)} placeholder="kullanici" /></label><label className="field"><span>{t.password}</span><input value={providerPassword} onChange={e => setProviderPassword(e.target.value)} type="password" placeholder="••••••••" /></label><label className="field full"><span>{t.link}</span><input value={providerLink} onChange={e => setProviderLink(e.target.value)} placeholder="https://provider.example" /></label></div>}{error && <div className="detected-line">{error}</div>}<div className="modal-footer"><span><ShieldCheck size={14} /> Şifre sunucuya güvenli bağlantıyla gönderilir.</span><div><button className="ghost-button" onClick={onClose}>{t.cancel}</button><button className="primary-button" disabled={busy} onClick={save}><Check size={16} /> {busy ? "Kaydediliyor..." : t.save}</button></div></div></div></div>;
}
function AuthModal({ mode, onModeChange, onClose }: { mode: "login" | "register"; onModeChange: (mode: "login" | "register") => void; onClose: () => void }) { const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const submit = async () => { setBusy(true); setError(""); try { const apiBase = window.location.hostname === "127.0.0.1" ? "https://crackteam-iptv.vercel.app" : ""; const response = await fetch(`${apiBase}/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || data.detail || "İşlem başarısız"); if (data.sessionToken) localStorage.setItem("ct_iptv_session", data.sessionToken); onClose(); window.location.reload(); } catch (e) { setError(e instanceof Error ? e.message : "İşlem başarısız"); } finally { setBusy(false); } }; return <div className="modal-backdrop" onClick={onClose}><div className="modal-card" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="panel-kicker">CRACKTEAM HESABI</span><h2>{mode === "login" ? "IPTV hesabına giriş" : "Yeni IPTV hesabı oluştur"}</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><div className="field-grid"><label className="field full"><span>Kullanıcı adı</span><input value={username} onChange={e => setUsername(e.target.value)} placeholder="ahmet" autoComplete="username" /></label><label className="field full"><span>Parola</span><input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} type="password" placeholder="En az 6 karakter" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label></div>{error && <div className="detected-line">{error}</div>}<div className="modal-footer"><span><ShieldCheck size={14} /> Parolan hash’lenerek saklanır.</span><div><button className="ghost-button" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>{mode === "login" ? "Kayıt ol" : "Giriş yap"}</button><button className="primary-button" disabled={busy} onClick={submit}>{busy ? "Bekleyin..." : mode === "login" ? "Giriş yap" : "Kayıt ol"}</button></div></div></div></div>; }

function ProSection({ lang, plan, category }: { lang: Lang; plan: string; category: "steam" | "mail" | "film" | "spor" | "haber" }) { if (!["pro", "ultra", "ultra_trial"].includes(plan)) return <div className="inner-page"><div className="page-title"><div><span className="eyebrow"><ShieldCheck size={14} /> PRO / {category.toUpperCase()}</span><h1>Pro alanı kilitli</h1><p>Bu gerçek Telegram akışına erişmek için Pro veya Ultra paket gerekir.</p></div><Badge tone="warning">Pro gerekli</Badge></div><div className="pro-feature-banner"><div><span className="panel-kicker lime-text">PRO ÖZELLİĞİ</span><h2>Beş özel sekme ve daha az reklam</h2><p>Steam, Mail, Film, Spor ve Haber akışları yalnızca Pro ve Ultra kullanıcılarına açıktır.</p></div><div className="pro-badge"><Crown size={25} /> PRO</div></div></div>; const labels = { steam: ["Steam fırsatları", "Oyun, DLC ve hediye kartı duyuruları"], mail: ["Mail merkezi", "Pro kullanıcılar için özel gelen kutusu"], film: ["Film arşivi", "Yeni yayınlar ve seçili öneriler"], spor: ["Spor akışı", "Maç, skor ve canlı yayın bildirimleri"], haber: ["Haber akışı", "Topluluktan seçili gündem notları"] } as const; const [title, subtitle] = labels[category]; const [items, setItems] = useState<ContentItem[]>([]); useEffect(() => { fetch(`/api/content/${category}?plan=pro`).then(r => r.ok ? r.json() : null).then(data => setItems(Array.isArray(data?.items) ? data.items : [])).catch(() => setItems([])); }, [category]); return <div className="inner-page"><div className="page-title"><div><span className="eyebrow"><Sparkles size={14} /> PRO / {category.toUpperCase()}</span><h1>{title}</h1><p>{subtitle}</p></div><Badge tone="default">{lang === "tr" ? "Gerçek Telegram akışı" : "Live Telegram feed"}</Badge></div><div className="pro-feature-banner"><div><span className="panel-kicker lime-text">PRO TOPLULUK AKIŞI</span><h2>{lang === "tr" ? "Etiketli içerikler burada görünür." : "Tagged content appears here."}</h2><p>{lang === "tr" ? "Kanalda ilgili etiketle yayınlanan mesajlar otomatik olarak listelenir." : "Channel posts with the matching tag are listed automatically."}</p></div><div className="pro-badge"><Crown size={25} /> PRO</div></div><div className="content-placeholder-grid">{items.length ? items.map((item, index) => <div className="content-placeholder" key={item.id ?? index}><div className="placeholder-icon"><Radio size={18} /></div><div><strong>{item.title || `@${category} Telegram içeriği`}</strong><span>{item.content || "İçerik metni yok"}</span></div></div>) : <div className="content-placeholder"><div className="placeholder-icon"><Radio size={18} /></div><div><strong>{lang === "tr" ? "Henüz yeni içerik yok" : "No new content yet"}</strong><span>{lang === "tr" ? `@${category} etiketiyle gelen ilk mesaj burada görünecek.` : `The first @${category} post will appear here.`}</span></div></div>}</div></div>; }

function Plans({ lang, currentPlan, onUpgrade }: { lang: Lang; currentPlan: string; onUpgrade: () => void }) { const t = copy[lang]; const [selected, setSelected] = useState<"Pro" | "Ultra" | null>(null); const selectedStars = selected === "Ultra" ? 100 : 50; return <div className="inner-page"><div className="page-title"><div><span className="eyebrow">HESABIN / PLANLAR</span><h1>Yayın deneyimini büyüt.</h1><p>İhtiyacına göre seç, istediğin zaman değiştir.</p></div><Badge tone="default">Plan doğrulanıyor</Badge></div><div className="plans-grid">{plans.map(plan => <div className={`plan-card ${plan.color}`} key={plan.name}>{plan.name === "Ultra" && <div className="popular">EN POPÜLER</div>}{plan.name.toLowerCase() === currentPlan.replace("_trial", "") && <div className="active-plan-badge">AKTİF</div>}<div className="plan-top"><span className="plan-name">{plan.name}</span>{plan.name === "Ultra" ? <Crown size={18} /> : <Zap size={18} />}</div><div className="plan-price"><strong>{plan.price}</strong><span>{plan.unit}</span></div><p>{plan.note}</p><div className="plan-features">{plan.features.map(f => <span key={f}><Check size={14} /> {f}</span>)}</div><button disabled={plan.name.toLowerCase() === currentPlan.replace("_trial", "")} className={plan.name.toLowerCase() === currentPlan.replace("_trial", "") ? "active-plan-button" : plan.name === "Ultra" ? "wide-button" : "outline-lime"} onClick={() => plan.name === "Free" ? onUpgrade() : setSelected(plan.name as "Pro" | "Ultra")}>{plan.name.toLowerCase() === currentPlan.replace("_trial", "") ? "Aktif paket" : plan.name === "Free" ? "Ücretsiz kullan" : "Paketi seç"}</button></div>)}</div>{selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal-card" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="panel-kicker lime-text">{selected.toUpperCase()} PAKET</span><h2>Ödeme ve aktivasyon</h2></div><button className="close-button" onClick={() => setSelected(null)}><X size={18} /></button></div><div className="content-placeholder-grid"><div className="content-placeholder"><strong>1. adım</strong><span><a href="https://t.me/ct_bot" target="_blank" rel="noreferrer">@ct_bot botuna gir</a>.</span></div><div className="content-placeholder"><strong>2. adım</strong><span>Bota şu formatta gönder: <code>/paket {selected} Ahmet</code>. Parola gönderme.</span></div><div className="content-placeholder"><strong>3. adım</strong><span>Bot sana {selectedStars} Telegram Yıldızı tutarını söyleyecek. Yıldızları <b>@crackbaba</b> hesabına gönder ve ödeme dekontu ile DM at.</span></div><div className="content-placeholder"><strong>4. adım</strong><span>Admin ödemeyi kontrol ettikten sonra bot, Telegram hesabını {selected} planına geçirir.</span></div></div><div className="modal-footer"><span><ShieldCheck size={14} /> Ödeme otomatik değil; aktivasyon admin onayından sonra yapılır.</span><button className="primary-button" onClick={() => setSelected(null)}>Anladım</button></div></div></div>}</div>; }
function Messages({ lang }: { lang: Lang }) { const t = copy[lang]; return <div className="inner-page"><div className="page-title"><div><span className="eyebrow">TOPLULUK / DM</span><h1>{t.messagesTitle}</h1><p>Gerçek bot ve admin mesajları geldiğinde burada gösterilir.</p></div></div><div className="content-placeholder-grid"><div className="content-placeholder"><MessageCircle size={19} /><div><strong>{lang === "tr" ? "Henüz mesaj yok" : "No messages yet"}</strong><span>{lang === "tr" ? "Sahte konuşma gösterilmiyor." : "Demo conversations are not shown."}</span></div></div></div></div>; }
function AdminPanel({ lang }: { lang: Lang; notify: (message: string) => void }) { return <div className="inner-page"><div className="page-title"><div><span className="eyebrow"><ShieldCheck size={14} /> ADMIN / CT BOT</span><h1>{lang === "tr" ? "Yönetim paneli" : "Admin panel"}</h1><p>{lang === "tr" ? "Bu alan yalnızca sunucu tarafından admin rolü doğrulanan hesaplarda açılır." : "This area is available only to accounts whose admin role is verified by the server."}</p></div><Badge tone="default">Sunucu doğrulaması gerekli</Badge></div><div className="content-placeholder-grid"><div className="content-placeholder"><ShieldCheck size={19} /><div><strong>{lang === "tr" ? "Henüz yönetim verisi yok" : "No admin data yet"}</strong><span>{lang === "tr" ? "Çekiliş, ücretsiz IPTV ve Telegram yönetim kayıtları gerçek backend bağlandığında burada görünecek." : "Giveaway, free IPTV and Telegram management records will appear here when the real backend is connected."}</span></div></div></div></div>; }
