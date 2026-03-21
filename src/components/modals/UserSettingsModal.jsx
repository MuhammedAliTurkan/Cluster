import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../services/userApi";
import { DEFAULT_BINDS, loadBinds, saveBinds, eventToCombo } from "../../hooks/useKeybinds";
import Avatar from "../common/Avatar";
import ImageCropModal from "./ImageCropModal";
import BotListPanel from "../bots/BotListPanel";
import toast from "react-hot-toast";

const TABS = [
  { id: "profile", label: "Profil" },
  { id: "theme",   label: "Tema" },
  { id: "audio",   label: "Ses & Görüntü" },
  { id: "keybinds", label: "Tus Atamalari" },
  { id: "accessibility", label: "Erisilebilirlik" },
  { id: "bots",    label: "Botlar" },
];

const BANNER_PRESETS = [
  "#059669", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  "#F47B67", "#E67E22", "#1ABC9C", "#3498DB", "#9B59B6",
];

// Ideal boyutlar
const AVATAR_SIZE = 256;   // 256x256 kare
const BANNER_W = 960;      // 960x240 genis
const BANNER_H = 240;

export default function UserSettingsModal({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  // --- Profile state ---
  const [displayName, setDisplayName] = useState("");
  const [bannerColor, setBannerColor] = useState("#059669");
  const [bannerPreview, setBannerPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  // --- Crop state ---
  const [cropSrc, setCropSrc] = useState(null);       // data URL of selected file
  const [cropType, setCropType] = useState(null);      // "avatar" | "banner"

  // --- Audio/Video state ---
  const [settings, setSettings] = useState(() => parseSettings(user?.settingsJson));
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName || "");
      setBannerColor(user.bannerColor || "#059669");
      setBannerPreview(null);
      setSettings(parseSettings(user.settingsJson));
      enumerateDevices();
    }
  }, [open, user]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      // Permission denied or no devices
    }
  }, []);

  if (!open) return null;

  // Dosya secilince -> crop modal ac
  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result);
      setCropType(type);
    };
    reader.readAsDataURL(file);
    // input'u resetle (ayni dosyayi tekrar secebilmek icin)
    e.target.value = "";
  };

  // Crop tamamlaninca -> upload
  const handleCropDone = async (croppedFile) => {
    setCropSrc(null);
    if (cropType === "avatar") {
      setUploading(true);
      try {
        await userApi.uploadAvatar(croppedFile);
        await refreshUser();
      } catch (err) {
        toast.error(err.response?.data?.message || "Avatar yüklenemedi");
      } finally {
        setUploading(false);
      }
    } else if (cropType === "banner") {
      setBannerUploading(true);
      try {
        await userApi.uploadBanner(croppedFile);
        await refreshUser();
        setBannerPreview(null);
      } catch (err) {
        toast.error(err.response?.data?.message || "Banner yüklenemedi");
      } finally {
        setBannerUploading(false);
      }
    }
    setCropType(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    setCropType(null);
  };

  const handleDeleteAvatar = async () => {
    try {
      await userApi.deleteAvatar();
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || "Avatar silinemedi");
    }
  };

  const handleDeleteBanner = async () => {
    try {
      await userApi.deleteBanner();
      await refreshUser();
      setBannerPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Banner silinemedi");
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsJson = JSON.stringify(settings);
      await userApi.updateMe({
        displayName: displayName.trim() || null,
        bannerColor,
        settingsJson,
      });
      await refreshUser();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Ayarlar kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const display = user?.displayName || user?.username || "Kullanıcı";
  const currentBanner = bannerPreview || user?.bannerUrl;

  return (
    <div className="fixed inset-0 z-50" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[min(720px,95vw)] h-[min(560px,90vh)] rounded-2xl bg-surface-2
                      border border-border shadow-2xl flex overflow-hidden">

        {/* Sol: Tab listesi */}
        <div className="w-48 bg-surface-1 border-r border-white/5 py-4 px-2 flex flex-col shrink-0">
          <div className="px-3 mb-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Kullanıcı Ayarları
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition mb-0.5 ${
                tab === t.id
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-white/5 px-2">
            <button
              onClick={onClose}
              className="w-full px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/5 text-left"
            >
              Kapat
            </button>
          </div>
        </div>

        {/* Sag: Icerik */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <span className="text-lg font-semibold text-white">
              {TABS.find((t) => t.id === tab)?.label}
            </span>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 grid place-items-center text-gray-400 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === "profile" && (
              <ProfileTab
                user={user}
                display={display}
                displayName={displayName}
                setDisplayName={setDisplayName}
                bannerColor={bannerColor}
                setBannerColor={setBannerColor}
                currentBanner={currentBanner}
                uploading={uploading}
                bannerUploading={bannerUploading}
                avatarRef={avatarRef}
                bannerRef={bannerRef}
                onFileSelect={handleFileSelect}
                onDeleteAvatar={handleDeleteAvatar}
                onDeleteBanner={handleDeleteBanner}
              />
            )}
            {tab === "theme" && <UserThemeTab />}
            {tab === "audio" && (
              <AudioTab
                settings={settings}
                updateSetting={updateSetting}
                audioDevices={audioDevices}
                outputDevices={outputDevices}
                videoDevices={videoDevices}
              />
            )}
            {tab === "keybinds" && <KeybindsTab />}
            {tab === "accessibility" && <AccessibilityTab />}
            {tab === "bots" && <BotListPanel />}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/5 flex justify-end gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 text-sm">
              Iptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-accent hover:bg-accent-dark disabled:opacity-60 text-white text-sm"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={cropType === "avatar" ? 1 : BANNER_W / BANNER_H}
          title={cropType === "avatar" ? "Avatar Kırp" : "Banner Kırp"}
          outputW={cropType === "avatar" ? AVATAR_SIZE : BANNER_W}
          outputH={cropType === "avatar" ? AVATAR_SIZE : BANNER_H}
          round={cropType === "avatar"}
          onDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({
  user, display, displayName, setDisplayName,
  bannerColor, setBannerColor, currentBanner,
  uploading, bannerUploading,
  avatarRef, bannerRef,
  onFileSelect, onDeleteAvatar, onDeleteBanner,
}) {
  return (
    <div className="space-y-6">
      {/* Banner + Avatar preview */}
      <div className="rounded-xl overflow-hidden border border-white/10">
        {/* Banner */}
        <div
          className="h-28 relative cursor-pointer group"
          style={{
            backgroundColor: currentBanner ? undefined : bannerColor,
            backgroundImage: currentBanner ? `url(${currentBanner})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onClick={() => bannerRef.current?.click()}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors grid place-items-center">
            <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {bannerUploading ? "Yükleniyor..." : "Banner Değiştir"}
            </span>
          </div>
          {/* Banner sil butonu */}
          {currentBanner && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteBanner(); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500/80
                         grid place-items-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Banner'i sil"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <input
            ref={bannerRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => onFileSelect(e, "banner")}
          />
        </div>

        {/* Avatar overlay */}
        <div className="bg-surface-1 px-4 pb-4 pt-0 relative">
          <div className="absolute -top-10 left-4">
            <div className="relative group cursor-pointer" onClick={() => avatarRef.current?.click()}>
              <div className="rounded-full border-[5px] border-border">
                <Avatar src={user?.avatarUrl} name={display} size={80} />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100
                              grid place-items-center transition-opacity text-white text-[10px] font-medium">
                {uploading ? "..." : "Değiştir"}
              </div>
              {/* Avatar sil butonu */}
              {user?.avatarUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAvatar(); }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600
                             grid place-items-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Avatarı sil"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              <input
                ref={avatarRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => onFileSelect(e, "avatar")}
              />
            </div>
          </div>
          <div className="pt-12 pl-1">
            <div className="text-white font-semibold text-lg">{display}</div>
            <div className="text-gray-400 text-sm">@{user?.username}</div>
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Görünen Ad</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user?.username}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10
                     focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm"
        />
      </div>

      {/* E-posta (readonly) */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">E-posta</label>
        <div className="p-3 rounded-lg bg-surface-0 text-gray-500 border border-white/10 text-sm">
          {user?.email}
        </div>
      </div>

      {/* Banner renk secimi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Banner Rengi</label>
        <p className="text-[11px] text-gray-500 mb-2">Banner resmi yoksa bu renk kullanılır</p>
        <div className="flex flex-wrap gap-2">
          {BANNER_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setBannerColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                bannerColor === c ? "border-white scale-110" : "border-transparent hover:border-white/30"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <div className="relative">
            <input
              type="color"
              value={bannerColor}
              onChange={(e) => setBannerColor(e.target.value)}
              className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent"
              title="Ozel renk sec"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Audio & Video Tab ─── */
function AudioTab({ settings, updateSetting, audioDevices, outputDevices, videoDevices }) {
  return (
    <div className="space-y-6">
      {/* Mikrofon secimi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Mikrofon</label>
        <select
          value={settings.audioInput || ""}
          onChange={(e) => updateSetting("audioInput", e.target.value)}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10
                     focus:border-accent outline-none text-sm appearance-none"
        >
          <option value="">Varsayilan</option>
          {audioDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Giris sesi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">
          Giriş Sesi — {settings.inputVolume ?? 100}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.inputVolume ?? 100}
          onChange={(e) => updateSetting("inputVolume", Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </div>

      {/* Hoparlor secimi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Hoparlor</label>
        <select
          value={settings.audioOutput || ""}
          onChange={(e) => updateSetting("audioOutput", e.target.value)}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10
                     focus:border-accent outline-none text-sm appearance-none"
        >
          <option value="">Varsayilan</option>
          {outputDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Hoparlor ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Cikis sesi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">
          Çıkış Sesi — {settings.outputVolume ?? 100}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.outputVolume ?? 100}
          onChange={(e) => updateSetting("outputVolume", Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </div>

      {/* Kamera secimi */}
      <div>
        <label className="block text-gray-300 text-sm mb-1.5 font-medium">Kamera</label>
        <select
          value={settings.videoInput || ""}
          onChange={(e) => updateSetting("videoInput", e.target.value)}
          className="w-full p-3 rounded-lg bg-surface-0 text-white border border-white/10
                     focus:border-accent outline-none text-sm appearance-none"
        >
          <option value="">Varsayilan</option>
          {videoDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Kamera ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Bildirim sesleri */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-300 font-medium">Bildirim Sesleri</div>
          <div className="text-[11px] text-gray-500">Mesaj ve arama bildirim sesleri</div>
        </div>
        <button
          onClick={() => updateSetting("notificationSounds", !(settings.notificationSounds ?? true))}
          className={`w-11 h-6 rounded-full transition-colors relative ${
            (settings.notificationSounds ?? true) ? "bg-accent" : "bg-gray-600"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
              (settings.notificationSounds ?? true) ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Ses isleme ayarlari */}
      <AudioProcessingSection />
    </div>
  );
}

/* ─── Ses İşleme Ayarları ─── */
function AudioProcessingSection() {
  const [ap, setAp] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cl-audio-processing") || "{}"); } catch { return {}; }
  });

  const update = (key, val) => {
    const next = { ...ap, [key]: val };
    setAp(next);
    localStorage.setItem("cl-audio-processing", JSON.stringify(next));
  };

  const Toggle = ({ label, desc, field, def = true }) => {
    const on = ap[field] ?? def;
    return (
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-300 font-medium">{label}</div>
          {desc && <div className="text-[11px] text-gray-500">{desc}</div>}
        </div>
        <button
          onClick={() => update(field, !on)}
          className={`w-11 h-6 rounded-full transition-colors relative ${on ? "bg-accent" : "bg-gray-600"}`}
        >
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
          <Toggle
            label="Gurultu Engelleme (WebRTC NS)"
            desc="WebRTC Noise Suppression — arka plan gurultusunu azaltir"
            field="noiseSuppression"
          />
          <Toggle
            label="Eko Engelleme (WebRTC AEC)"
            desc="WebRTC Acoustic Echo Cancellation — hoparlorden mikrofona yansıyan sesi engeller"
            field="echoCancellation"
          />
          <Toggle
            label="Otomatik Ses Kazanımı (WebRTC AGC)"
            desc="WebRTC Auto Gain Control — mikrofon ses seviyesini otomatik ayarlar"
            field="autoGainControl"
          />
        </div>
      </div>

      <div className="border-t border-border-light pt-4 mt-2">
        <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-3">Mikrofon Ses Esigi</h4>

        {/* Mod seçimi */}
        <div className="flex gap-2 mb-3">
          {[
            { value: "off", label: "Kapalı", desc: "Tüm sesler iletilir" },
            { value: "auto", label: "Otomatik", desc: "Ortam gürültüsüne göre ayarlanır" },
            { value: "manual", label: "Manuel", desc: "Kendin ayarla" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => update("thresholdMode", opt.value)}
              className={`flex-1 py-2 rounded-lg text-center transition border ${
                (ap.thresholdMode || "off") === opt.value
                  ? "bg-accent/15 border-accent text-accent-light"
                  : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4"
              }`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Otomatik mod açıklaması */}
        {(ap.thresholdMode || "off") === "auto" && (
          <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 mb-3">
            <p className="text-[12px] text-accent-light">
              Ortam gürültünüz analiz edilerek eşik otomatik belirlenir. Sessiz ortamda düşük, gürültülü ortamda yüksek eşik uygulanır.
            </p>
          </div>
        )}

        {/* Manuel slider */}
        {(ap.thresholdMode || "off") === "manual" && (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 w-14 shrink-0">Esik: {ap.voiceThreshold ?? 20}%</span>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={ap.voiceThreshold ?? 20}
                onChange={(e) => update("voiceThreshold", Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Düşük (5%)</span>
              <span>Yuksek (80%)</span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-600 mt-2">
          Eşik altındaki sesler iletilmez. Klavye, fan gibi arka plan gürültüsünü engellemek için kullanın.
        </p>
      </div>
    </>
  );
}

function parseSettings(json) {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

/* ─── Erişilebilirlik Tab ─── */
const FONT_SIZES = [
  { value: 14, label: "Kucuk",     desc: "14px" },
  { value: 15, label: "Kompakt",   desc: "15px" },
  { value: 16, label: "Normal",    desc: "16px" },
  { value: 18, label: "Buyuk",     desc: "18px" },
  { value: 20, label: "Cok Buyuk", desc: "20px" },
];

function applyFontSize(px) {
  document.documentElement.style.fontSize = px + "px";
  localStorage.setItem("cl-font-size", String(px));
}

function AccessibilityTab() {
  const [fontSize, setFontSize] = useState(() => {
    const saved = parseInt(localStorage.getItem("cl-font-size"), 10);
    return isNaN(saved) ? 16 : saved;
  });

  const handleSize = (val) => {
    setFontSize(val);
    applyFontSize(val);
  };

  const handleReset = () => {
    handleSize(16);
  };

  return (
    <div className="space-y-6">
      {/* Yazı boyutu */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-1">Yazi Boyutu</h3>
        <p className="text-[12px] text-gray-500 mb-3">Butonlar, ikonlar, yazılar ve aralik boyutlarini ayarla. Sayfa duzeni sabit kalir.</p>
        <div className="flex gap-2">
          {FONT_SIZES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSize(opt.value)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                fontSize === opt.value
                  ? "bg-accent/15 border-accent text-accent-light"
                  : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4 hover:text-gray-200"
              }`}
            >
              <div>{opt.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Ince Ayar</span>
          <span className="text-xs text-gray-500">{fontSize}px</span>
        </div>
        <input
          type="range"
          min="12"
          max="22"
          step="1"
          value={fontSize}
          onChange={(e) => handleSize(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>12px</span>
          <span>22px</span>
        </div>
      </div>

      {/* Onizleme */}
      <div className="rounded-xl bg-surface-3 border border-border-light p-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-3">Onizleme</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-[22%] bg-accent grid place-items-center text-white text-xs font-semibold shrink-0">A</div>
          <div>
            <div className="text-sm text-white font-medium">Örnek Kullanıcı</div>
            <div className="text-xs text-gray-400">Bu bir ornek mesajdir</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm">Buton</button>
          <button className="px-3 py-1.5 rounded-lg bg-surface-5 text-gray-300 text-sm">Iptal</button>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="text-xs text-gray-500 hover:text-accent-light transition underline"
      >
        Varsayilana sifirla (16px)
      </button>
    </div>
  );
}

/* ─── Tuş Atamaları Tab ─── */
const BIND_ACTIONS = [
  { key: "toggleMic",    label: "Mikrofonu Sustur / Ac",   icon: "🎤" },
  { key: "toggleDeafen", label: "Sagırlastir / Ac",        icon: "🔇" },
  { key: "leaveCall",    label: "Sesli Kanaldan Ayrıl",    icon: "📞" },
  { key: "pushToTalk",   label: "Bas-Konus (Push to Talk)", icon: "🗣️" },
];

function KeybindsTab() {
  const [binds, setBinds] = useState(loadBinds);
  const [recording, setRecording] = useState(null); // hangi aksiyon kaydediliyor

  const update = (actionKey, combo) => {
    const next = { ...binds, [actionKey]: combo };
    setBinds(next);
    saveBinds(next);
    window.dispatchEvent(new Event("keybinds-updated"));
    setRecording(null);
  };

  const resetAll = () => {
    setBinds({ ...DEFAULT_BINDS });
    saveBinds({ ...DEFAULT_BINDS });
    window.dispatchEvent(new Event("keybinds-updated"));
  };

  // Tuş kaydetme listener
  useEffect(() => {
    if (!recording) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Sadece modifier tuşlarına basıldıysa bekle
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
      // Delete/Backspace ile atamayı sil
      if (e.key === "Delete" || e.key === "Backspace") {
        update(recording, "");
        return;
      }
      const combo = eventToCombo(e);
      update(recording, combo);
    };
    const cancel = (e) => {
      if (e.key === "Escape") { setRecording(null); }
    };
    window.addEventListener("keydown", handler, true);
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("keydown", handler, true);
      window.removeEventListener("keydown", cancel);
    };
  }, [recording, binds]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white text-sm font-semibold mb-1">Tus Atamalari</h3>
        <p className="text-[12px] text-gray-500 mb-4">Kisayol tuslarini ozellestirebilirsin. Bir atamaya tiklayip yeni tus kombinasyonu gir.</p>
      </div>

      <div className="space-y-1">
        {BIND_ACTIONS.map(({ key, label, icon }) => {
          const isRecording = recording === key;
          const combo = binds[key];
          return (
            <div key={key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-surface-3 transition">
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{icon}</span>
                <span className="text-sm text-gray-200">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecording(isRecording ? null : key)}
                  className={`min-w-[120px] px-3 py-1.5 rounded-lg text-sm font-mono transition border ${
                    isRecording
                      ? "bg-accent/20 border-accent text-accent-light animate-pulse"
                      : combo
                        ? "bg-surface-3 border-border-light text-gray-200 hover:border-accent/50"
                        : "bg-surface-3 border-border-light text-gray-500 hover:border-accent/50"
                  }`}
                >
                  {isRecording ? "Tusa bas..." : combo || "Atanmamis"}
                </button>
                {combo && (
                  <button
                    onClick={() => update(key, "")}
                    className="p-1 rounded text-gray-500 hover:text-rose-400 transition"
                    title="Kaldır"
                  >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                      <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Push-to-talk açıklama */}
      <div className="rounded-lg bg-surface-3 border border-border-light p-3">
        <p className="text-[11px] text-gray-400">
          <strong className="text-gray-300">Bas-Konus:</strong> Atanan tusa basili tuttugun surece mikrofon acilir, birakinca kapanir. Input alanlari dahil her yerde calisir.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={resetAll}
          className="text-xs text-gray-500 hover:text-accent-light transition underline"
        >
          Tum atamalari sifirla
        </button>
        <div className="text-[10px] text-gray-600">
          Varsayılan: Alt+M (Mik) · Alt+D (Sağır) · Alt+Q (Ayrıl)
        </div>
      </div>
    </div>
  );
}

/* ── Kullanıcı Teması ── */
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
    reader.onload = (ev) => {
      // Data URL olarak sakla (localStorage)
      save({ chatBackgroundUrl: ev.target.result });
    };
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
          {[
            { value: "server", label: "Sunucu Teması" },
            { value: "user", label: "Kişisel Tema" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => save({ prefer: opt.value })}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                (theme.prefer || "server") === opt.value
                  ? "bg-accent text-white"
                  : "bg-surface-4 text-gray-300 hover:bg-surface-5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Arka Planı */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Chat Arka Planı</label>
        <p className="text-xs text-gray-500 mb-3">Resim veya GIF yükleyin. Sadece siz göreceksiniz.</p>

        {theme.chatBackgroundUrl ? (
          <div className="mb-3">
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
              <img src={theme.chatBackgroundUrl} alt="bg" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-surface-2/60" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1 rounded bg-surface-4 text-white text-xs hover:bg-surface-5 transition"
                >
                  Değiştir
                </button>
                <button
                  onClick={() => save({ chatBackgroundUrl: null })}
                  className="px-3 py-1 rounded bg-rose-600 text-white text-xs hover:bg-rose-700 transition"
                >
                  Kaldır
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-32 rounded-lg border-2 border-dashed border-border-light hover:border-accent/40 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Resim veya GIF Yükle</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Vurgu Rengi */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Vurgu Rengi</label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.color}
              onClick={() => save({ accentColor: p.color })}
              className={`w-8 h-8 rounded-full border-2 transition ${
                theme.accentColor === p.color ? "border-white scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: p.color }}
              title={p.label}
            />
          ))}
          <label className="w-8 h-8 rounded-full border-2 border-dashed border-border-light flex items-center justify-center cursor-pointer hover:border-accent/40 transition" title="Özel renk">
            <input
              type="color"
              value={theme.accentColor || "#10b981"}
              onChange={(e) => save({ accentColor: e.target.value })}
              className="sr-only"
            />
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500" fill="currentColor">
              <circle cx="8" cy="8" r="3" />
            </svg>
          </label>
        </div>
      </div>

      {/* Opaklık */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Arka Plan Opaklığı</label>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round((theme.opacity ?? 0.85) * 100)}
          onChange={(e) => save({ opacity: parseInt(e.target.value) / 100 })}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Koyu</span>
          <span>%{Math.round((theme.opacity ?? 0.85) * 100)}</span>
          <span>Açık</span>
        </div>
      </div>
    </div>
  );
}
