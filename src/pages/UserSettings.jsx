import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMedia } from "../context/MediaContext";
import { userApi } from "../services/userApi";
import { DEFAULT_BINDS, loadBinds, saveBinds, eventToCombo } from "../hooks/useKeybinds";
import { paths } from "../routes/paths";
import Avatar from "../components/common/Avatar";
import ImageCropModal from "../components/modals/ImageCropModal";
import BotListPanel from "../components/bots/BotListPanel";
import toast from "react-hot-toast";

const TABS = [
  { id: "profile", label: "Profil" },
  { id: "theme", label: "Tema" },
  { id: "audio", label: "Ses & Görüntü" },
  { id: "keybinds", label: "Tus Atamalari" },
  { id: "accessibility", label: "Erisilebilirlik" },
  { id: "bots", label: "Botlar" },
];

const BANNER_PRESETS = [
  "#059669", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  "#F47B67", "#E67E22", "#1ABC9C", "#3498DB", "#9B59B6",
];

const AVATAR_SIZE = 256;
const BANNER_W = 960;
const BANNER_H = 240;

/* ── CSS Animasyonlu Arka Plan Presetleri ── */
const CSS_BG_PRESETS = [
  {
    id: "none",
    label: "Yok",
    style: {},
  },
  {
    id: "gradient-aurora",
    label: "Aurora",
    style: {
      background: "linear-gradient(-45deg, #0f172a, #1e1b4b, #0c4a6e, #064e3b)",
      backgroundSize: "400% 400%",
      animation: "bgShift 15s ease infinite",
    },
  },
  {
    id: "gradient-sunset",
    label: "Gün Batımı",
    style: {
      background: "linear-gradient(-45deg, #1a0a2e, #4a1942, #7c2d12, #451a03)",
      backgroundSize: "400% 400%",
      animation: "bgShift 12s ease infinite",
    },
  },
  {
    id: "gradient-ocean",
    label: "Okyanus",
    style: {
      background: "linear-gradient(-45deg, #0c1220, #0e2439, #0c4a6e, #164e63)",
      backgroundSize: "400% 400%",
      animation: "bgShift 18s ease infinite",
    },
  },
  {
    id: "gradient-forest",
    label: "Orman",
    style: {
      background: "linear-gradient(-45deg, #052e16, #14532d, #1a2e05, #365314)",
      backgroundSize: "400% 400%",
      animation: "bgShift 20s ease infinite",
    },
  },
  {
    id: "gradient-nebula",
    label: "Nebula",
    style: {
      background: "linear-gradient(-45deg, #2e1065, #4c1d95, #831843, #1e1b4b)",
      backgroundSize: "400% 400%",
      animation: "bgShift 14s ease infinite",
    },
  },
  {
    id: "mesh-dark",
    label: "Karanlık Ağ",
    style: {
      backgroundColor: "#0c0d0f",
      backgroundImage: `radial-gradient(at 20% 30%, rgba(16,185,129,0.08) 0, transparent 50%),
        radial-gradient(at 80% 70%, rgba(59,130,246,0.08) 0, transparent 50%),
        radial-gradient(at 50% 50%, rgba(139,92,246,0.05) 0, transparent 50%)`,
    },
  },
  {
    id: "particles",
    label: "Parçacıklar",
    style: {
      backgroundColor: "#0c0d0f",
      backgroundImage: `radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.15) 50%, transparent 50%),
        radial-gradient(1px 1px at 30% 60%, rgba(255,255,255,0.1) 50%, transparent 50%),
        radial-gradient(1px 1px at 50% 40%, rgba(255,255,255,0.12) 50%, transparent 50%),
        radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.08) 50%, transparent 50%),
        radial-gradient(1px 1px at 90% 30%, rgba(255,255,255,0.1) 50%, transparent 50%),
        radial-gradient(2px 2px at 15% 85%, rgba(16,185,129,0.2) 50%, transparent 50%),
        radial-gradient(2px 2px at 85% 15%, rgba(59,130,246,0.2) 50%, transparent 50%)`,
    },
  },
];

export default function UserSettings() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [bannerColor, setBannerColor] = useState("#059669");
  const [bannerPreview, setBannerPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  // Crop state
  const [cropSrc, setCropSrc] = useState(null);
  const [cropType, setCropType] = useState(null);

  // Audio state
  const [settings, setSettings] = useState(() => parseSettings(user?.settingsJson));
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBannerColor(user.bannerColor || "#059669");
      setBannerPreview(null);
      setSettings(parseSettings(user.settingsJson));
      enumerateDevices();
    }
  }, [user]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
    } catch {}
  }, []);

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result); setCropType(type); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropDone = async (croppedFile) => {
    setCropSrc(null);
    if (cropType === "avatar") {
      setUploading(true);
      try { await userApi.uploadAvatar(croppedFile); await refreshUser(); }
      catch (err) { toast.error(err.response?.data?.message || "Avatar yuklenemedi"); }
      finally { setUploading(false); }
    } else if (cropType === "banner") {
      setBannerUploading(true);
      try { await userApi.uploadBanner(croppedFile); await refreshUser(); setBannerPreview(null); }
      catch (err) { toast.error(err.response?.data?.message || "Banner yuklenemedi"); }
      finally { setBannerUploading(false); }
    }
    setCropType(null);
  };

  const handleDeleteAvatar = async () => {
    try { await userApi.deleteAvatar(); await refreshUser(); }
    catch (err) { toast.error(err.response?.data?.message || "Avatar silinemedi"); }
  };

  const handleDeleteBanner = async () => {
    try { await userApi.deleteBanner(); await refreshUser(); setBannerPreview(null); }
    catch (err) { toast.error(err.response?.data?.message || "Banner silinemedi"); }
  };

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateMe({
        displayName: displayName.trim() || null,
        bannerColor,
        settingsJson: JSON.stringify(settings),
      });
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || "Ayarlar kaydedilemedi");
    } finally { setSaving(false); }
  };

  const goBack = () => nav(-1);
  const display = user?.displayName || user?.username || "Kullanıcı";
  const currentBanner = bannerPreview || user?.bannerUrl;

  return (
    <div className="h-full flex bg-surface-2">
      {/* Sol menü */}
      <div className="w-56 shrink-0 bg-surface-3 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Kullanıcı Ayarları</div>
          <div className="text-white font-semibold truncate">{display}</div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-0.5 transition ${
                tab === t.id
                  ? "bg-surface-5 text-white"
                  : "text-gray-300 hover:bg-surface-4 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border space-y-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-accent hover:bg-accent-dark text-white transition disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button
            onClick={goBack}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-surface-4 hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Geri Don
          </button>
        </div>
      </div>

      {/* Sağ içerik */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          {tab === "profile" && (
            <ProfileTab
              user={user} display={display}
              displayName={displayName} setDisplayName={setDisplayName}
              bannerColor={bannerColor} setBannerColor={setBannerColor}
              currentBanner={currentBanner}
              uploading={uploading} bannerUploading={bannerUploading}
              avatarRef={avatarRef} bannerRef={bannerRef}
              onFileSelect={handleFileSelect}
              onDeleteAvatar={handleDeleteAvatar}
              onDeleteBanner={handleDeleteBanner}
            />
          )}
          {tab === "theme" && <UserThemeTab />}
          {tab === "audio" && (
            <AudioTab
              settings={settings} updateSetting={updateSetting}
              audioDevices={audioDevices} outputDevices={outputDevices} videoDevices={videoDevices}
            />
          )}
          {tab === "keybinds" && <KeybindsTab />}
          {tab === "accessibility" && <AccessibilityTab />}
          {tab === "bots" && <BotListPanel />}
        </div>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={cropType === "avatar" ? 1 : BANNER_W / BANNER_H}
          title={cropType === "avatar" ? "Avatar Kirp" : "Banner Kirp"}
          outputW={cropType === "avatar" ? AVATAR_SIZE : BANNER_W}
          outputH={cropType === "avatar" ? AVATAR_SIZE : BANNER_H}
          round={cropType === "avatar"}
          onDone={handleCropDone}
          onCancel={() => { setCropSrc(null); setCropType(null); }}
        />
      )}
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({
  user, display, displayName, setDisplayName,
  bannerColor, setBannerColor, currentBanner,
  uploading, bannerUploading, avatarRef, bannerRef,
  onFileSelect, onDeleteAvatar, onDeleteBanner,
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Profil</h2>
      <div className="rounded-xl overflow-hidden border border-white/10">
        <div
          className="h-36 relative cursor-pointer group"
          style={{
            backgroundColor: currentBanner ? undefined : bannerColor,
            backgroundImage: currentBanner ? `url(${currentBanner})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
          }}
          onClick={() => bannerRef.current?.click()}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors grid place-items-center">
            <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {bannerUploading ? "Yukleniyor..." : "Banner Değiştir"}
            </span>
          </div>
          {currentBanner && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteBanner(); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500/80 grid place-items-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
          <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => onFileSelect(e, "banner")} />
        </div>
        <div className="bg-surface-1 px-4 pb-4 pt-0 relative">
          <div className="absolute -top-10 left-4">
            <div className="relative group cursor-pointer" onClick={() => avatarRef.current?.click()}>
              <div className="rounded-full border-[5px] border-border"><Avatar src={user?.avatarUrl} name={display} size={80} /></div>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity text-white text-[10px] font-medium">{uploading ? "..." : "Değiştir"}</div>
              {user?.avatarUrl && (
                <button onClick={(e) => { e.stopPropagation(); onDeleteAvatar(); }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 grid place-items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
              <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => onFileSelect(e, "avatar")} />
            </div>
          </div>
          <div className="pt-12 pl-1">
            <div className="text-white font-semibold text-lg">{display}</div>
            <div className="text-gray-400 text-sm">@{user?.username}</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Görünen Ad</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={user?.username}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm" />
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">E-posta</label>
        <div className="p-3 rounded-lg bg-surface-0 text-gray-500 border border-white/10 text-sm">{user?.email}</div>
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Banner Rengi</label>
        <p className="text-[11px] text-gray-500 mb-2">Banner resmi yoksa bu renk kullanılır</p>
        <div className="flex flex-wrap gap-2">
          {BANNER_PRESETS.map((c) => (
            <button key={c} onClick={() => setBannerColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${bannerColor === c ? "border-white scale-110" : "border-transparent hover:border-white/30"}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent" />
        </div>
      </div>
    </div>
  );
}

/* ─── Tema Tab ─── */
function UserThemeTab() {
  const fileRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cl-user-theme") || "{}"); } catch { return {}; }
  });

  const save = (updates) => {
    const next = { ...theme, ...updates };
    setTheme(next);
    localStorage.setItem("cl-user-theme", JSON.stringify(next));
  };

  const ACCENT_PRESETS = [
    { color: "#10b981", label: "Zümrüt" },
    { color: "#3b82f6", label: "Mavi" },
    { color: "#8b5cf6", label: "Mor" },
    { color: "#f59e0b", label: "Amber" },
    { color: "#ef4444", label: "Kırmızı" },
    { color: "#ec4899", label: "Pembe" },
    { color: "#06b6d4", label: "Camgöbeği" },
    { color: "#84cc16", label: "Lime" },
  ];

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => save({ chatBackgroundUrl: ev.target.result, cssBgPreset: null });
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Kişisel Tema</h2>

      {/* Tema Tercihi */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Tema Tercihi</label>
        <p className="text-xs text-gray-500 mb-3">Sunucu teması mı yoksa kişisel temanız mı kullanılsın?</p>
        <div className="flex gap-2">
          {[{ value: "server", label: "Sunucu Temasi" }, { value: "user", label: "Kişisel Tema" }].map((opt) => (
            <button key={opt.value} onClick={() => save({ prefer: opt.value })}
              className={`px-4 py-2 rounded-lg text-sm transition ${(theme.prefer || "server") === opt.value ? "bg-accent text-white" : "bg-surface-4 text-gray-300 hover:bg-surface-5"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CSS Animasyonlu Arka Planlar */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Hazır Arka Planlar</label>
        <p className="text-xs text-gray-500 mb-3">CSS animasyonlu arka plan seçin.</p>
        <div className="grid grid-cols-4 gap-2">
          {CSS_BG_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => save({ cssBgPreset: preset.id === "none" ? null : preset.id, chatBackgroundUrl: null })}
              className={`h-20 rounded-lg border-2 overflow-hidden transition relative ${
                theme.cssBgPreset === preset.id || (!theme.cssBgPreset && preset.id === "none")
                  ? "border-accent"
                  : "border-border-light hover:border-accent/40"
              }`}
            >
              <div className="absolute inset-0" style={preset.style} />
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className="text-[10px] text-white/80 font-medium drop-shadow-md">{preset.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Özel Resim/GIF */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Özel Arka Plan</label>
        <p className="text-xs text-gray-500 mb-3">Resim veya GIF yukleyin. Sadece siz goreceksiniz.</p>
        {theme.chatBackgroundUrl ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border mb-3">
            <img src={theme.chatBackgroundUrl} alt="bg" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-surface-2/60" />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="px-3 py-1 rounded bg-surface-4 text-white text-xs hover:bg-surface-5 transition">Değiştir</button>
              <button onClick={() => save({ chatBackgroundUrl: null })} className="px-3 py-1 rounded bg-rose-600 text-white text-xs hover:bg-rose-700 transition">Kaldir</button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-24 rounded-lg border-2 border-dashed border-border-light hover:border-accent/40 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Resim veya GIF Yukle</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Vurgu Rengi */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Vurgu Rengi</label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((p) => (
            <button key={p.color} onClick={() => save({ accentColor: p.color })}
              className={`w-8 h-8 rounded-full border-2 transition ${theme.accentColor === p.color ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: p.color }} title={p.label} />
          ))}
          <label className="w-8 h-8 rounded-full border-2 border-dashed border-border-light flex items-center justify-center cursor-pointer hover:border-accent/40 transition">
            <input type="color" value={theme.accentColor || "#10b981"} onChange={(e) => save({ accentColor: e.target.value })} className="sr-only" />
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500" fill="currentColor"><circle cx="8" cy="8" r="3" /></svg>
          </label>
        </div>
      </div>

      {/* Opaklık */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Arka Plan Opakliği</label>
        <input type="range" min="0" max="100" value={Math.round((theme.opacity ?? 0.85) * 100)}
          onChange={(e) => save({ opacity: parseInt(e.target.value) / 100 })} className="w-full accent-emerald-500" />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Koyu</span><span>%{Math.round((theme.opacity ?? 0.85) * 100)}</span><span>Açık</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Audio Tab ─── */
function AudioTab({ settings, updateSetting, audioDevices, outputDevices, videoDevices }) {
  const media = useMedia();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Ses & Görüntü</h2>

      {/* Giriş Modu Seçimi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Giriş Modu</label>
        <p className="text-[11px] text-gray-500 mb-2">Mikrofonunuzun nasıl etkinleştirileceğini seçin.</p>
        <div className="flex gap-2">
          {[
            { value: "voice", label: "Ses Aktivitesi", desc: "Konuşunca otomatik iletir", icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )},
            { value: "ptt", label: "Bas-Konus", desc: "Tusa basili tutarak konus", icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <rect x="6" y="4" width="12" height="16" rx="2" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="12" r="1" fill="currentColor" />
              </svg>
            )},
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => media.changeInputMode(opt.value)}
              className={`flex-1 py-3 px-3 rounded-lg text-center transition border ${
                media.inputMode === opt.value
                  ? "bg-accent/15 border-accent text-accent-light"
                  : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4 hover:text-gray-200"
              }`}
            >
              <div className="flex justify-center mb-1.5">{opt.icon}</div>
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
        {media.inputMode === "ptt" && (
          <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-[12px] text-amber-300">
              Bas-Konus modu aktif. Tus Atamalari sekmesinden bir tus atayin. Sesli kanala girdiginizde mikrofonunuz kapalı baslar, atanan tusa basili tuttugunuzda acilir.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Mikrofon</label>
        <select value={settings.audioInput || ""} onChange={(e) => updateSetting("audioInput", e.target.value)}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10 focus:border-accent outline-none text-sm appearance-none">
          <option value="">Varsayilan</option>
          {audioDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Giriş Sesi — {settings.inputVolume ?? 100}%</label>
        <input type="range" min="0" max="100" value={settings.inputVolume ?? 100} onChange={(e) => updateSetting("inputVolume", Number(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Hoparlor</label>
        <select value={settings.audioOutput || ""} onChange={(e) => updateSetting("audioOutput", e.target.value)}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10 focus:border-accent outline-none text-sm appearance-none">
          <option value="">Varsayilan</option>
          {outputDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Hoparlor ${d.deviceId.slice(0, 8)}`}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Çıkış Sesi — {settings.outputVolume ?? 100}%</label>
        <input type="range" min="0" max="100" value={settings.outputVolume ?? 100} onChange={(e) => updateSetting("outputVolume", Number(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Kamera</label>
        <select value={settings.videoInput || ""} onChange={(e) => updateSetting("videoInput", e.target.value)}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10 focus:border-accent outline-none text-sm appearance-none">
          <option value="">Varsayilan</option>
          {videoDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${d.deviceId.slice(0, 8)}`}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-300 font-medium">Bildirim Sesleri</div>
          <div className="text-[11px] text-gray-500">Mesaj ve arama bildirim sesleri</div>
        </div>
        <button onClick={() => updateSetting("notificationSounds", !(settings.notificationSounds ?? true))}
          className={`w-11 h-6 rounded-full transition-colors relative ${(settings.notificationSounds ?? true) ? "bg-accent" : "bg-gray-600"}`}>
          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${(settings.notificationSounds ?? true) ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
      <AudioProcessingSection />
    </div>
  );
}

/* ─── Ses İşleme ─── */
function AudioProcessingSection() {
  const [ap, setAp] = useState(() => { try { return JSON.parse(localStorage.getItem("cl-audio-processing") || "{}"); } catch { return {}; } });
  const update = (key, val) => { const next = { ...ap, [key]: val }; setAp(next); localStorage.setItem("cl-audio-processing", JSON.stringify(next)); };

  const Toggle = ({ label, desc, field, def = true }) => {
    const on = ap[field] ?? def;
    return (
      <div className="flex items-center justify-between">
        <div><div className="text-sm text-gray-300 font-medium">{label}</div>{desc && <div className="text-[11px] text-gray-500">{desc}</div>}</div>
        <button onClick={() => update(field, !on)} className={`w-11 h-6 rounded-full transition-colors relative ${on ? "bg-accent" : "bg-gray-600"}`}>
          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="border-t border-border-light pt-4 mt-2">
        <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-3">Ses Isleme</h4>
        <div className="space-y-4">
          <Toggle label="Gurultu Engelleme (WebRTC NS)" desc="Arka plan gurultusunu azaltir" field="noiseSuppression" />
          <Toggle label="Eko Engelleme (WebRTC AEC)" desc="Hoparlorden mikrofona yansıyan sesi engeller" field="echoCancellation" />
          <Toggle label="Otomatik Ses Kazanımı (WebRTC AGC)" desc="Mikrofon ses seviyesini otomatik ayarlar" field="autoGainControl" />
        </div>
      </div>
      <div className="border-t border-border-light pt-4 mt-2">
        <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-3">Mikrofon Ses Esigi</h4>
        <div className="flex gap-2 mb-3">
          {[{ value: "off", label: "Kapalı", desc: "Tüm sesler iletilir" }, { value: "auto", label: "Otomatik", desc: "Ortama göre ayarlanır" }, { value: "manual", label: "Manuel", desc: "Kendin ayarla" }].map((opt) => (
            <button key={opt.value} onClick={() => update("thresholdMode", opt.value)}
              className={`flex-1 py-2 rounded-lg text-center transition border ${(ap.thresholdMode || "off") === opt.value ? "bg-accent/15 border-accent text-accent-light" : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4"}`}>
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
        {(ap.thresholdMode || "off") === "manual" && (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 w-14 shrink-0">Esik: {ap.voiceThreshold ?? 20}%</span>
              <input type="range" min="5" max="80" step="5" value={ap.voiceThreshold ?? 20} onChange={(e) => update("voiceThreshold", Number(e.target.value))} className="flex-1 accent-emerald-500" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function parseSettings(json) { if (!json) return {}; try { return JSON.parse(json); } catch { return {}; } }

/* ─── Erişilebilirlik ─── */
const FONT_SIZES = [
  { value: 14, label: "Kucuk", desc: "14px" }, { value: 15, label: "Kompakt", desc: "15px" },
  { value: 16, label: "Normal", desc: "16px" }, { value: 18, label: "Buyuk", desc: "18px" },
  { value: 20, label: "Cok Buyuk", desc: "20px" },
];

function AccessibilityTab() {
  const [fontSize, setFontSize] = useState(() => { const s = parseInt(localStorage.getItem("cl-font-size"), 10); return isNaN(s) ? 16 : s; });
  const handleSize = (val) => { setFontSize(val); document.documentElement.style.fontSize = val + "px"; localStorage.setItem("cl-font-size", String(val)); };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Erisilebilirlik</h2>
      <div>
        <h3 className="text-white text-sm font-semibold mb-1">Yazi Boyutu</h3>
        <p className="text-[12px] text-gray-500 mb-3">Butonlar, ikonlar, yazılar boyutlarini ayarla.</p>
        <div className="flex gap-2">
          {FONT_SIZES.map((opt) => (
            <button key={opt.value} onClick={() => handleSize(opt.value)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${fontSize === opt.value ? "bg-accent/15 border-accent text-accent-light" : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4"}`}>
              <div>{opt.label}</div><div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-400">Ince Ayar</span><span className="text-xs text-gray-500">{fontSize}px</span></div>
        <input type="range" min="12" max="22" step="1" value={fontSize} onChange={(e) => handleSize(Number(e.target.value))} className="w-full accent-emerald-500" />
      </div>
      <button onClick={() => handleSize(16)} className="text-xs text-gray-500 hover:text-accent-light transition underline">Varsayilana sifirla (16px)</button>
    </div>
  );
}

/* ─── Tuş Atamaları ─── */
const BIND_ACTIONS = [
  { key: "toggleMic", label: "Mikrofonu Sustur / Ac", icon: "🎤" },
  { key: "toggleDeafen", label: "Sagırlastir / Ac", icon: "🔇" },
  { key: "leaveCall", label: "Sesli Kanaldan Ayrıl", icon: "📞" },
  { key: "pushToTalk", label: "Bas-Konus (Push to Talk)", icon: "🗣️" },
];

function KeybindsTab() {
  const [binds, setBinds] = useState(loadBinds);
  const [recording, setRecording] = useState(null);
  const update = (actionKey, combo) => { const next = { ...binds, [actionKey]: combo }; setBinds(next); saveBinds(next); window.dispatchEvent(new Event("keybinds-updated")); setRecording(null); };
  const resetAll = () => { setBinds({ ...DEFAULT_BINDS }); saveBinds({ ...DEFAULT_BINDS }); window.dispatchEvent(new Event("keybinds-updated")); };

  useEffect(() => {
    if (!recording) return;
    const handler = (e) => { e.preventDefault(); e.stopPropagation(); if (["Control","Alt","Shift","Meta"].includes(e.key)) return; if (e.key === "Delete" || e.key === "Backspace") { update(recording, ""); return; } update(recording, eventToCombo(e)); };
    const cancel = (e) => { if (e.key === "Escape") setRecording(null); };
    window.addEventListener("keydown", handler, true);
    window.addEventListener("keydown", cancel);
    return () => { window.removeEventListener("keydown", handler, true); window.removeEventListener("keydown", cancel); };
  }, [recording, binds]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Tus Atamalari</h2>
      <p className="text-[12px] text-gray-500 mb-4">Kisayol tuslarini ozellestirebilirsin.</p>
      <div className="space-y-1">
        {BIND_ACTIONS.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-surface-3 transition">
            <div className="flex items-center gap-3"><span className="text-lg w-6 text-center">{icon}</span><span className="text-sm text-gray-200">{label}</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setRecording(recording === key ? null : key)}
                className={`min-w-[120px] px-3 py-1.5 rounded-lg text-sm font-mono transition border ${recording === key ? "bg-accent/20 border-accent text-accent-light animate-pulse" : binds[key] ? "bg-surface-3 border-border-light text-gray-200 hover:border-accent/50" : "bg-surface-3 border-border-light text-gray-500 hover:border-accent/50"}`}>
                {recording === key ? "Tusa bas..." : binds[key] || "Atanmamis"}
              </button>
              {binds[key] && (
                <button onClick={() => update(key, "")} className="p-1 rounded text-gray-500 hover:text-rose-400 transition">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button onClick={resetAll} className="text-xs text-gray-500 hover:text-accent-light transition underline">Tüm atamaları sıfırla</button>
    </div>
  );
}
