import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useChat } from "../context/ChatContext";
import { serverApi } from "../services/serverApi";
import { http } from "../services/http";
import { paths } from "../routes/paths";
import ImageCropModal from "../components/modals/ImageCropModal";
import InstalledBotsList from "../components/bots/InstalledBotsList";
import toast from "react-hot-toast";

const TABS = [
  { id: "my-profile", label: "Sunucu Profilim" },
  { id: "overview", label: "Genel Bakış" },
  { id: "channels", label: "Kanallar" },
  { id: "topics", label: "Konular" },
  { id: "theme", label: "Tema" },
  { id: "roles", label: "Roller" },
  { id: "members", label: "Üyeler" },
  { id: "invites", label: "Davetler" },
  { id: "bans", label: "Yasaklılar" },
  { id: "bots", label: "Botlar" },
  { id: "moderation", label: "Moderasyon" },
  { id: "audit", label: "Denetim Kaydı" },
];

export default function ServerSettings() {
  const { activeServerId } = useChat();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get("tab");
    return TABS.some((x) => x.id === t) ? t : "my-profile";
  });
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeServerId) return;
    let alive = true;
    setLoading(true);
    serverApi.get(activeServerId)
      .then((data) => alive && setServer(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [activeServerId]);

  const goBack = () => nav(paths.chat);

  if (!activeServerId) {
    return <div className="h-full grid place-items-center text-gray-400">Sunucu seçilmedi.</div>;
  }

  return (
    <div className="h-full flex bg-surface-2">
      {/* Sol menu */}
      <div className="w-56 shrink-0 bg-surface-3 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Sunucu Ayarları</div>
          <div className="text-white font-semibold truncate">{server?.name || "..."}</div>
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
        <div className="p-2 border-t border-border">
          <button
            onClick={goBack}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-surface-4 hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Geri Dön
          </button>
        </div>
      </div>

      {/* Sag icerik */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-gray-400">Yükleniyor...</div>
        ) : (
          <div className="max-w-2xl mx-auto p-8">
            {tab === "my-profile" && <MyServerProfileTab serverId={activeServerId} />}
            {tab === "overview" && <OverviewTab server={server} onUpdate={setServer} />}
            {tab === "channels" && <ChannelsTab serverId={activeServerId} />}
            {tab === "topics" && <TopicsTab serverId={activeServerId} />}
            {tab === "theme" && <ThemeTab server={server} onUpdate={setServer} />}
            {tab === "roles" && <RolesTab serverId={activeServerId} />}
            {tab === "members" && <MembersTab serverId={activeServerId} />}
            {tab === "invites" && <InvitesTab serverId={activeServerId} />}
            {tab === "bans" && <BansTab serverId={activeServerId} />}
            {tab === "bots" && <InstalledBotsList serverId={activeServerId} />}
            {tab === "moderation" && <ModerationTab serverId={activeServerId} />}
            {tab === "audit" && <AuditTab serverId={activeServerId} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Genel Bakis ── */
function OverviewTab({ server, onUpdate }) {
  const [name, setName] = useState(server?.name || "");
  const [desc, setDesc] = useState(server?.description || "");
  const [isPublic, setIsPublic] = useState(server?.isPublic || false);
  const [defaultChannelId, setDefaultChannelId] = useState(server?.defaultChannelId || "");
  const [channels, setChannels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null); // "icon" | "banner"
  const [cropSrc, setCropSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState(null); // "icon" | "banner"
  const iconInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    setName(server?.name || "");
    setDesc(server?.description || "");
    setIsPublic(server?.isPublic || false);
    setDefaultChannelId(server?.defaultChannelId || "");
  }, [server]);

  useEffect(() => {
    if (!server?.id) return;
    serverApi.channels(server.id).then(setChannels).catch(() => {});
  }, [server?.id]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const data = await serverApi.update(server.id, { name: name.trim(), description: desc.trim() || null, isPublic, defaultChannelId: defaultChannelId || null });
      onUpdate(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result);
      setCropTarget(target);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropDone = async (croppedFile) => {
    setCropSrc(null);
    const target = cropTarget;
    setCropTarget(null);
    setUploading(target);
    try {
      let data;
      if (target === "icon") {
        data = await serverApi.uploadIcon(server.id, croppedFile);
      } else {
        data = await serverApi.uploadBanner(server.id, croppedFile);
      }
      onUpdate(data);
      window.dispatchEvent(new Event("servers-updated"));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteIcon = async () => {
    try {
      const data = await serverApi.deleteIcon(server.id);
      onUpdate(data);
      window.dispatchEvent(new Event("servers-updated"));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const handleDeleteBanner = async () => {
    try {
      const data = await serverApi.deleteBanner(server.id);
      onUpdate(data);
      window.dispatchEvent(new Event("servers-updated"));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Genel Bakış</h2>

      <div className="space-y-5">
        {/* Banner */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Sunucu Banner</label>
          <div
            className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-2 border border-border-light cursor-pointer group"
            onClick={() => bannerInputRef.current?.click()}
          >
            {server?.bannerUrl ? (
              <img src={server.bannerUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#3a3d43] to-[#2b2d31] grid place-items-center">
                <span className="text-gray-500 text-sm">Banner yüklemek için tıkla</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
              <span className="text-white text-sm font-medium">
                {uploading === "banner" ? "Yükleniyor..." : "Değiştir"}
              </span>
            </div>
            {server?.bannerUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteBanner(); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                title="Bannerı sil"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "banner")} />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Sunucu İkonu</label>
          <div className="flex items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-2 border-2 border-border-light cursor-pointer group shrink-0"
              onClick={() => iconInputRef.current?.click()}
            >
              {server?.iconUrl ? (
                <img src={server.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-2xl font-bold text-gray-500">
                  {server?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 text-white">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              {server?.iconUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteIcon(); }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-red-500 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                  title="İkonu sil"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {uploading === "icon" ? "Yükleniyor..." : "Önerilen: 256x256 piksel, PNG veya JPG"}
            </div>
          </div>
          <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "icon")} />
        </div>

        {/* Ad */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Sunucu Adı</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-md bg-surface-2 text-white border border-border-light focus:border-accent focus:ring-2 focus:ring-accent outline-none"
          />
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Açıklama</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="Sunucu hakkında kısa bilgi..."
            className="w-full p-3 rounded-md bg-surface-2 text-white border border-border-light focus:border-accent focus:ring-2 focus:ring-accent outline-none resize-none"
          />
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-surface-2 border border-border-light">
          <div>
            <div className="text-sm text-white font-medium">Herkese Açık Sunucu</div>
            <div className="text-xs text-gray-400 mt-0.5">Keşfet'te görünür, herkes katılabilir</div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic((p) => !p)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-accent" : "bg-surface-5"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {/* Karsilama Kanali */}
        <div className="p-4 rounded-lg bg-surface-2 border border-border-light">
          <div className="text-sm text-white font-medium mb-1">Karşılama Kanalı</div>
          <div className="text-xs text-gray-400 mb-3">Yeni üyeler sunucuya katıldığında ilk bu kanalı görür</div>
          <select
            value={defaultChannelId}
            onChange={(e) => setDefaultChannelId(e.target.value)}
            className="w-full p-2.5 rounded-md bg-surface-3 text-white border border-border-light focus:border-accent outline-none text-sm"
          >
            <option value="">Seçilmedi (ilk kanal)</option>
            {channels.filter((c) => c.type === "TEXT").map((c) => (
              <option key={c.id} value={c.id}>#{c.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="px-5 py-2 rounded-md bg-accent hover:bg-accent-dark text-white font-medium disabled:opacity-60 transition"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          {saved && <span className="text-sm text-green-400">Kaydedildi</span>}
        </div>
      </div>

      {/* Tehlikeli alan */}
      <div className="mt-10 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
        <h3 className="text-sm font-semibold text-red-400 mb-2">Tehlikeli Bölge</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-300">Sunucuyu Sil</div>
            <div className="text-xs text-gray-500">Bu işlem geri alınamaz.</div>
          </div>
          <button className="px-4 py-2 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm border border-red-500/40 transition">
            Sunucuyu Sil
          </button>
        </div>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={cropTarget === "icon" ? 1 : 960 / 240}
          outputWidth={cropTarget === "icon" ? 256 : 960}
          outputHeight={cropTarget === "icon" ? 256 : 240}
          cropShape={cropTarget === "icon" ? "round" : "rect"}
          onDone={handleCropDone}
          onCancel={() => { setCropSrc(null); setCropTarget(null); }}
        />
      )}
    </div>
  );
}

/* ── Eski birlesik key → yeni tekil key'lere migrasyon ── */
const PERM_MIGRATION = {
  MANAGE_SERVER: ["EDIT_SERVER"],
  MANAGE_ROLES: ["CREATE_ROLES", "EDIT_ROLES", "DELETE_ROLES", "ASSIGN_ROLES"],
  MANAGE_CHANNELS: ["CREATE_CHANNELS", "EDIT_CHANNELS", "DELETE_CHANNELS"],
  MANAGE_MESSAGES: ["DELETE_MESSAGES", "PIN_MESSAGES"],
  MANAGE_NICKNAMES: ["EDIT_NICKNAMES"],
};

function migratePerms(permsObj) {
  const migrated = { ...permsObj };
  let changed = false;
  for (const [oldKey, newKeys] of Object.entries(PERM_MIGRATION)) {
    if (oldKey in migrated) {
      const val = migrated[oldKey];
      for (const nk of newKeys) {
        if (!(nk in migrated)) { migrated[nk] = val; }
      }
      delete migrated[oldKey];
      changed = true;
    }
  }
  return changed ? migrated : permsObj;
}

/* ── Standart izinler ── */
const PERMISSION_GROUPS = [
  {
    group: "Genel",
    perms: [
      { key: "EDIT_SERVER", label: "Sunucuyu Düzenle", desc: "Sunucu adını, açıklamasını ve ayarlarını değiştirebilir" },
      { key: "VIEW_AUDIT_LOG", label: "Denetim Kaydını Gör", desc: "Sunucu denetim kayıtlarını görüntüleyebilir" },
    ],
  },
  {
    group: "Rol Yönetimi",
    perms: [
      { key: "CREATE_ROLES", label: "Rol Oluştur", desc: "Yeni roller oluşturabilir" },
      { key: "EDIT_ROLES", label: "Rolleri Düzenle", desc: "Mevcut rollerin adını, rengini ve izinlerini değiştirebilir" },
      { key: "DELETE_ROLES", label: "Rolleri Sil", desc: "Mevcut rolleri silebilir" },
      { key: "ASSIGN_ROLES", label: "Rol Ata", desc: "Üyelere rol atayabilir veya kaldırabilir" },
    ],
  },
  {
    group: "Üye Yönetimi",
    perms: [
      { key: "KICK_MEMBERS", label: "Üyeleri At", desc: "Üyeleri sunucudan çıkartabilir" },
      { key: "BAN_MEMBERS", label: "Üyeleri Yasakla", desc: "Üyeleri sunucudan kalıcı olarak yasaklayabilir" },
      { key: "CREATE_INVITES", label: "Davet Oluştur", desc: "Davet kodları oluşturabilir" },
      { key: "CHANGE_NICKNAME", label: "Takma Ad Değiştir", desc: "Kendi takma adını değiştirebilir" },
      { key: "EDIT_NICKNAMES", label: "Takma Adları Düzenle", desc: "Diğer üyelerin takma adlarını değiştirebilir" },
    ],
  },
  {
    group: "Kanal Yönetimi",
    perms: [
      { key: "CREATE_CHANNELS", label: "Kanal Oluştur", desc: "Yeni kanallar oluşturabilir" },
      { key: "EDIT_CHANNELS", label: "Kanalları Düzenle", desc: "Kanal adını ve ayarlarını değiştirebilir" },
      { key: "DELETE_CHANNELS", label: "Kanalları Sil", desc: "Mevcut kanalları silebilir" },
      { key: "VIEW_CHANNELS", label: "Kanalları Gör", desc: "Sunucudaki kanalları görüntüleyebilir" },
    ],
  },
  {
    group: "Metin Kanalları",
    perms: [
      { key: "SEND_MESSAGES", label: "Mesaj Gönder", desc: "Kanallara mesaj gönderebilir" },
      { key: "DELETE_MESSAGES", label: "Mesajları Sil", desc: "Başkalarının mesajlarını silebilir" },
      { key: "PIN_MESSAGES", label: "Mesajları Sabitle", desc: "Kanaldaki mesajları sabitleyebilir" },
      { key: "EMBED_LINKS", label: "Bağlantı Önizlemesi", desc: "Gönderilen linklerin önizlemesi görünür" },
      { key: "ATTACH_FILES", label: "Dosya Ekle", desc: "Mesajlara dosya ve görsel ekleyebilir" },
      { key: "READ_MESSAGE_HISTORY", label: "Mesaj Geçmişini Oku", desc: "Eski mesajları görüntüleyebilir" },
      { key: "MENTION_EVERYONE", label: "@everyone Etiketle", desc: "Tüm üyeleri etiketleyebilir" },
      { key: "ADD_REACTIONS", label: "Tepki Ekle", desc: "Mesajlara emoji tepkisi ekleyebilir" },
    ],
  },
  {
    group: "Sesli Kanallar",
    perms: [
      { key: "CONNECT_VOICE", label: "Sesli Kanala Katıl", desc: "Sesli kanallara bağlanabilir" },
      { key: "SPEAK_VOICE", label: "Konuşma", desc: "Sesli kanallarda konuşabilir" },
      { key: "STREAM_VIDEO", label: "Video / Ekran Paylaş", desc: "Kamera veya ekran paylaşımı yapabilir" },
      { key: "MUTE_MEMBERS", label: "Üyelerin Sesini Kapat", desc: "Diğer üyelerin mikrofonunu kapatabilir" },
      { key: "DEAFEN_MEMBERS", label: "Üyelerin Sesini Kes", desc: "Diğer üyelerin hem mikrofon hem hoparlör sesini kesebilir" },
      { key: "MOVE_MEMBERS", label: "Üyeleri Taşı", desc: "Üyeleri başka sesli kanallara taşıyabilir" },
      { key: "PRIORITY_SPEAKER", label: "Öncelikli Konuşmacı", desc: "Konuşurken diğer üyelerin sesi kısılır" },
    ],
  },
];

function parsePerms(json) {
  try {
    const parsed = JSON.parse(json || "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    return migratePerms(parsed);
  } catch { return {}; }
}

/* ── Roller ── */
function RolesTab({ serverId }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, membersData] = await Promise.all([
        serverApi.listRoles(serverId),
        serverApi.members(serverId),
      ]);
      setRoles(rolesData || []);
      setMembers(membersData || []);
    } catch {}
    setLoading(false);
  }, [serverId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const memberCountForRole = (roleId) => members.filter((m) => m.role?.id === roleId).length;

  /* ── Sıralama ── */
  // roles zaten position DESC sıralı (backend öyle döner). Liste index 0 = en yüksek pozisyon.
  const swapPositions = async (idxA, idxB) => {
    if (idxA < 0 || idxB < 0 || idxA >= roles.length || idxB >= roles.length) return;
    const a = roles[idxA];
    const b = roles[idxB];
    if (a.managed || b.managed) return; // sistem rolü taşınamaz
    // Optimistic UI — swap in local state
    const newRoles = [...roles];
    const posA = a.position;
    const posB = b.position;
    newRoles[idxA] = { ...a, position: posB };
    newRoles[idxB] = { ...b, position: posA };
    newRoles.sort((x, y) => (y.position ?? 0) - (x.position ?? 0));
    setRoles(newRoles);
    // Persist both
    try {
      await Promise.all([
        serverApi.updateRole(serverId, a.id, { name: a.name, color: a.color, position: posB, permissionsJson: a.permissionsJson }),
        serverApi.updateRole(serverId, b.id, { name: b.name, color: b.color, position: posA, permissionsJson: b.permissionsJson }),
      ]);
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || e.message);
      fetchData(); // geri al
    }
  };

  const moveUp = (e, idx) => {
    e.stopPropagation();
    swapPositions(idx, idx - 1);
  };
  const moveDown = (e, idx) => {
    e.stopPropagation();
    swapPositions(idx, idx + 1);
  };

  /* ── Sürükle bırak ── */
  const handleDragStart = (e, idx) => {
    if (roles[idx].managed) { e.preventDefault(); return; }
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    // Sırayı yeniden hesapla
    reorderDrag(dragIdx, dropIdx);
    setDragIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const reorderDrag = async (fromIdx, toIdx) => {
    const moved = roles[fromIdx];
    if (moved.managed) return;
    const newRoles = roles.filter((_, i) => i !== fromIdx);
    newRoles.splice(toIdx, 0, moved);
    // Yeni pozisyon değerlerini ata: index 0 = en yüksek
    const updates = [];
    const updatedRoles = newRoles.map((r, i) => {
      const newPos = newRoles.length - 1 - i; // index 0 => highest
      if (!r.managed && r.position !== newPos) {
        updates.push({ id: r.id, name: r.name, color: r.color, position: newPos, permissionsJson: r.permissionsJson });
      }
      return { ...r, position: newPos };
    });
    updatedRoles.sort((x, y) => (y.position ?? 0) - (x.position ?? 0));
    setRoles(updatedRoles);
    if (updates.length > 0) {
      try {
        await Promise.all(updates.map((u) =>
          serverApi.updateRole(serverId, u.id, { name: u.name, color: u.color, position: u.position, permissionsJson: u.permissionsJson })
        ));
      } catch (e) {
        toast.error(e.response?.data?.message || e.response?.data || e.message);
        fetchData();
      }
    }
  };

  const startCreate = () => {
    const maxPos = roles.reduce((max, r) => Math.max(max, r.position ?? 0), 0);
    setEditing({
      _new: true,
      name: "",
      color: "#99AAB5",
      position: maxPos + 1,
      permissionsJson: JSON.stringify({ VIEW_CHANNELS: true, SEND_MESSAGES: true, READ_MESSAGE_HISTORY: true, EMBED_LINKS: true, ATTACH_FILES: true, ADD_REACTIONS: true, CONNECT_VOICE: true, SPEAK_VOICE: true, STREAM_VIDEO: true, CREATE_INVITES: true, CHANGE_NICKNAME: true }),
    });
  };

  const startEdit = (role) => {
    setEditing({ ...role });
  };

  const handleSave = async () => {
    if (!editing || !editing.name?.trim()) return;
    setSaving(true);
    try {
      if (editing._new) {
        await serverApi.createRole(serverId, {
          name: editing.name.trim(),
          color: editing.color || null,
          position: editing.position ?? 0,
          permissionsJson: editing.permissionsJson || "{}",
        });
      } else {
        await serverApi.updateRole(serverId, editing.id, {
          name: editing.name.trim(),
          color: editing.color || null,
          position: editing.position ?? editing.position,
          permissionsJson: editing.permissionsJson || "{}",
        });
      }
      setEditing(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId) => {
    if (!confirm("Bu rolü silmek istediğinize emin misiniz?")) return;
    try {
      await serverApi.deleteRole(serverId, roleId);
      setEditing(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || e.message);
    }
  };

  const togglePerm = (key) => {
    const perms = parsePerms(editing.permissionsJson);
    perms[key] = !perms[key];
    setEditing({ ...editing, permissionsJson: JSON.stringify(perms) });
  };

  /* ── Düzenleme ekranı ── */
  if (editing) {
    const perms = parsePerms(editing.permissionsJson);
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setEditing(null)}
            className="text-gray-400 hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-white">
            {editing._new ? "Yeni Rol" : `Rol Düzenle — ${editing.name}`}
          </h2>
        </div>

        <div className="space-y-5">
          {/* Ad */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rol Adı</label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              maxLength={40}
              className="w-full p-3 rounded-md bg-surface-2 text-white border border-border-light focus:border-accent focus:ring-2 focus:ring-accent outline-none"
            />
          </div>

          {/* Renk */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rol Rengi</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editing.color || "#99AAB5"}
                onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-sm text-gray-400 font-mono">{editing.color || "#99AAB5"}</span>
            </div>
          </div>

          {/* İzinler — gruplu */}
          <div>
            <label className="block text-sm text-gray-300 mb-3">İzinler</label>
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.group}>
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 px-1">{g.group}</div>
                  <div className="space-y-1">
                    {g.perms.map((p) => (
                      <div
                        key={p.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border-light"
                      >
                        <div>
                          <div className="text-sm text-white">{p.label}</div>
                          <div className="text-[11px] text-gray-400">{p.desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePerm(p.key)}
                          className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${perms[p.key] ? "bg-accent" : "bg-surface-5"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${perms[p.key] ? "translate-x-5" : ""}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kaydet / Sil */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !editing.name?.trim()}
              className="px-5 py-2 rounded-md bg-accent hover:bg-accent-dark text-white font-medium disabled:opacity-60 transition"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-5 py-2 rounded-md bg-surface-5 hover:bg-surface-6 text-gray-300 transition"
            >
              İptal
            </button>
            {!editing._new && !editing.managed && (
              <button
                onClick={() => handleDelete(editing.id)}
                className="ml-auto px-4 py-2 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm border border-red-500/40 transition"
              >
                Rolü Sil
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Rol listesi ── */
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Roller</h2>
        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-md bg-accent hover:bg-accent-dark text-white text-sm transition"
        >
          Rol Oluştur
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yükleniyor...</div>
      ) : roles.length === 0 ? (
        <div className="text-gray-400 text-sm">Henüz rol yok.</div>
      ) : (
        <div className="space-y-1">
          {roles.map((r, idx) => (
            <div
              key={r.id}
              draggable={!r.managed}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => !r.managed && startEdit(r)}
              className={`flex items-center gap-2 p-3 rounded-lg bg-surface-2 border transition select-none ${
                dragOverIdx === idx && dragIdx !== idx
                  ? "border-accent bg-accent/10"
                  : "border-border-light"
              } ${dragIdx === idx ? "opacity-40" : ""} ${
                r.managed ? "opacity-70" : "cursor-pointer hover:border-accent/50"
              }`}
            >
              {/* Sürükleme tutacağı */}
              {!r.managed ? (
                <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 shrink-0" title="Sürükle">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                  </svg>
                </div>
              ) : <div className="w-4 shrink-0" />}

              {/* Sıra numarası */}
              <span className="text-[11px] text-gray-500 w-6 text-center shrink-0 font-mono">{r.position ?? 0}</span>

              {/* Renk + İsim */}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: r.color || "#99AAB5" }}
              />
              <span className="text-white text-sm flex-1 truncate">{r.name}</span>
              {r.managed && <span className="text-[10px] text-gray-500 bg-surface-5 px-1.5 py-0.5 rounded shrink-0">Sistem</span>}

              {/* Üye sayısı */}
              <span className="text-xs text-gray-400 shrink-0 mr-1">{memberCountForRole(r.id)} üye</span>

              {/* Yukarı / Aşağı okları */}
              {!r.managed && (
                <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => moveUp(e, idx)}
                    disabled={idx === 0 || roles[idx - 1]?.managed}
                    className="text-gray-500 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed p-0.5 transition"
                    title="Yukarı taşı"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => moveDown(e, idx)}
                    disabled={idx === roles.length - 1}
                    className="text-gray-500 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed p-0.5 transition"
                    title="Aşağı taşı"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Uyeler ── */
function MyServerProfileTab({ serverId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAvatarCrop, setShowAvatarCrop] = useState(null);
  const [showBannerCrop, setShowBannerCrop] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await serverApi.getMyServerProfile(serverId);
      setProfile(data);
      setNickname(data.nickname || "");
    } catch (e) {
      console.error("Profile fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const saveNickname = async () => {
    setSaving(true);
    try {
      const data = await serverApi.updateMyServerProfile(serverId, { nickname: nickname.trim() });
      setProfile(data);
      setNickname(data.nickname || "");
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAvatarCrop(file);
    e.target.value = "";
  };

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowBannerCrop(file);
    e.target.value = "";
  };

  const onAvatarCropped = async (croppedFile) => {
    setShowAvatarCrop(null);
    try {
      const data = await serverApi.uploadMyServerAvatar(serverId, croppedFile);
      setProfile(data);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const onBannerCropped = async (croppedFile) => {
    setShowBannerCrop(null);
    try {
      const data = await serverApi.uploadMyServerBanner(serverId, croppedFile);
      setProfile(data);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const deleteAvatar = async () => {
    try {
      const data = await serverApi.deleteMyServerAvatar(serverId);
      setProfile(data);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const deleteBanner = async () => {
    try {
      const data = await serverApi.deleteMyServerBanner(serverId);
      setProfile(data);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Yükleniyor...</div>;
  if (!profile) return <div className="text-gray-400 text-sm">Profil bulunamadı.</div>;

  const globalName = profile.user?.displayName || profile.user?.username || "?";
  const effectiveName = profile.nickname || globalName;
  const effectiveAvatar = profile.serverAvatarUrl || profile.user?.avatarUrl;
  const effectiveBanner = profile.serverBannerUrl || profile.user?.bannerUrl;
  const hasNicknameChange = (nickname.trim() || "") !== (profile.nickname || "");

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Sunucu Profilim</h2>
      <p className="text-sm text-gray-400 mb-6">Bu ayarlar sadece bu sunucuda geçerlidir.</p>

      {/* Onizleme karti */}
      <div className="bg-surface-3 rounded-xl overflow-hidden mb-8 border border-border-light">
        {/* Banner */}
        <div className="relative h-24 bg-surface-5">
          {effectiveBanner && (
            <img src={effectiveBanner} alt="" className="w-full h-full object-cover" />
          )}
          {!effectiveBanner && profile.user?.bannerColor && (
            <div className="w-full h-full" style={{ backgroundColor: profile.user.bannerColor }} />
          )}
        </div>
        {/* Avatar + isim */}
        <div className="px-4 pb-4 relative">
          <div className="relative -mt-8 mb-2 w-16 h-16">
            {effectiveAvatar ? (
              <img src={effectiveAvatar} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-surface-3" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-5 border-4 border-surface-3 grid place-items-center text-xl text-gray-300">
                {effectiveName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-white font-semibold text-lg">{effectiveName}</div>
          <div className="text-gray-400 text-sm">{profile.user?.username}</div>
          {profile.roles && profile.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.roles.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-5 text-xs text-gray-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || "#99AAB5" }} />
                  {r.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Takma Ad */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-300 block mb-2">Sunucu Takma Adı</label>
        <div className="flex gap-2">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={globalName}
            maxLength={100}
            className="flex-1 p-3 rounded-lg bg-surface-2 text-white border border-border-light focus:border-accent focus:ring-2 focus:ring-accent outline-none text-sm"
          />
          <button
            onClick={saveNickname}
            disabled={saving || !hasNicknameChange}
            className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {saving ? "..." : "Kaydet"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Boş bırakırsan global adın kullanılır.</p>
      </div>

      {/* Sunucu Avatarı */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-300 block mb-2">Sunucu Avatarı</label>
        <div className="flex items-center gap-3">
          {profile.serverAvatarUrl ? (
            <img src={profile.serverAvatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-5 grid place-items-center text-gray-500 text-xs border border-dashed border-border-light">
              Yok
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-medium cursor-pointer transition inline-block text-center">
              Yükle
              <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
            </label>
            {profile.serverAvatarUrl && (
              <button
                onClick={deleteAvatar}
                className="px-3 py-1.5 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 rounded-lg text-xs font-medium transition"
              >
                Kaldır
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Sadece bu sunucuda gösterilen avatar. Boş ise global avatarın kullanılır.</p>
      </div>

      {/* Sunucu Bannerı */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-300 block mb-2">Sunucu Bannerı</label>
        <div className="flex flex-col gap-2">
          {profile.serverBannerUrl ? (
            <img src={profile.serverBannerUrl} alt="" className="w-full max-w-md h-20 rounded-lg object-cover" />
          ) : (
            <div className="w-full max-w-md h-20 rounded-lg bg-surface-5 grid place-items-center text-gray-500 text-xs border border-dashed border-border-light">
              Banner yok
            </div>
          )}
          <div className="flex gap-2">
            <label className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-medium cursor-pointer transition inline-block text-center">
              Yükle
              <input type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
            </label>
            {profile.serverBannerUrl && (
              <button
                onClick={deleteBanner}
                className="px-3 py-1.5 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 rounded-lg text-xs font-medium transition"
              >
                Kaldır
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Sadece bu sunucuda gösterilen banner.</p>
      </div>

      {/* Crop Modals */}
      {showAvatarCrop && (
        <ImageCropModal
          file={showAvatarCrop}
          aspect={1}
          outputWidth={256}
          outputHeight={256}
          circularCrop
          onCrop={onAvatarCropped}
          onCancel={() => setShowAvatarCrop(null)}
        />
      )}
      {showBannerCrop && (
        <ImageCropModal
          file={showBannerCrop}
          aspect={960 / 240}
          outputWidth={960}
          outputHeight={240}
          onCrop={onBannerCropped}
          onCancel={() => setShowBannerCrop(null)}
        />
      )}
    </div>
  );
}

function MembersTab({ serverId }) {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(null); // userId
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 }); // tıklanan butonun pozisyonu
  const [roleDropdown, setRoleDropdown] = useState(null); // userId
  const [banModal, setBanModal] = useState(null); // { userId, name }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        serverApi.members(serverId),
        serverApi.listRoles(serverId),
      ]);
      setMembers(membersData || []);
      setRoles(rolesData || []);
    } catch {}
    setLoading(false);
  }, [serverId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChangeRole = async (userId, roleId) => {
    try {
      await serverApi.updateMemberRole(serverId, userId, roleId);
      setMenuOpen(null);
      setRoleDropdown(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || e.message);
    }
  };

  const handleToggleRole = async (userId, roleId, currentRoleIds) => {
    try {
      const has = currentRoleIds.includes(roleId);
      let newIds;
      if (has) {
        newIds = currentRoleIds.filter((id) => id !== roleId);
        if (newIds.length === 0) return; // en az 1 rol olmali
      } else {
        newIds = [...currentRoleIds, roleId];
      }
      await serverApi.updateMemberRole(serverId, userId, null, newIds);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || e.message);
    }
  };

  const handleKick = async (userId, name) => {
    if (!confirm(`${name} adlı üyeyi sunucudan atmak istediğinize emin misiniz?`)) return;
    try {
      await serverApi.removeMember(serverId, userId);
      setMenuOpen(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || e.message);
    }
  };

  const handleBan = (userId, name) => {
    setMenuOpen(null);
    setBanModal({ userId, name });
  };

  const confirmBan = async (reason) => {
    if (!banModal) return;
    try {
      await http.post(`/api/servers/${serverId}/members/${banModal.userId}/ban`, { reason: reason || null });
      setBanModal(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.message || e.message);
    }
  };

  const handleTimeout = async (userId, minutes) => {
    try {
      await http.post(`/api/servers/${serverId}/members/${userId}/timeout`, { minutes });
      setMenuOpen(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.message || e.message);
    }
  };

  const openMenu = (e, userId) => {
    e.stopPropagation();
    if (menuOpen === userId) {
      setMenuOpen(null);
      setRoleDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setMenuOpen(userId);
    setRoleDropdown(null);
  };

  const filtered = q.trim()
    ? members.filter((m) => {
        const name = (m.user?.displayName || m.user?.username || "").toLowerCase();
        return name.includes(q.toLowerCase());
      })
    : members;

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Üyeler ({members.length})</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Üye ara..."
        className="w-full p-3 rounded-md bg-surface-2 text-white border border-border-light focus:border-accent focus:ring-2 focus:ring-accent outline-none mb-4"
      />
      {loading ? (
        <div className="text-gray-400 text-sm">Yükleniyor...</div>
      ) : (
        <div className="space-y-1">
          {filtered.map((m) => {
            const name = m.user?.displayName || m.user?.username || "?";
            const isOwner = m.role?.managed;
            const userId = m.user?.id;
            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 transition relative">
                <div className="flex items-center gap-3">
                  {m.user?.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-5 grid place-items-center text-sm text-gray-300">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium" style={{ color: m.role?.color || "#FFFFFF" }}>
                    {name}
                  </span>
                </div>

                {!isOwner && (
                  <button
                    onClick={(e) => openMenu(e, userId)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-surface-4 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Menü portali — tüm liste dışında, tek bir yerde */}
      {menuOpen && createPortal(
        <MemberContextMenu
          pos={menuPos}
          userId={menuOpen}
          name={filtered.find((m) => m.user?.id === menuOpen)?.user?.displayName || filtered.find((m) => m.user?.id === menuOpen)?.user?.username || "?"}
          roles={roles}
          currentRoleId={filtered.find((m) => m.user?.id === menuOpen)?.role?.id}
          currentRoleIds={(filtered.find((m) => m.user?.id === menuOpen)?.roles || []).map((r) => r.id)}
          roleDropdown={roleDropdown}
          setRoleDropdown={setRoleDropdown}
          onChangeRole={handleChangeRole}
          onToggleRole={handleToggleRole}
          onKick={handleKick}
          onBan={handleBan}
          onTimeout={handleTimeout}
          onClose={() => { setMenuOpen(null); setRoleDropdown(null); }}
        />,
        document.body
      )}

      {banModal && createPortal(
        <BanModal
          name={banModal.name}
          onConfirm={confirmBan}
          onCancel={() => setBanModal(null)}
        />,
        document.body
      )}
    </div>
  );
}

/* ── Ban Modal ── */
function BanModal({ name, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConfirm(reason.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-surface-1 border border-border-light rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-white">Üyeyi Yasakla</h3>
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-medium text-red-400">{name}</span> adlı üye sunucudan yasaklanacak ve bir daha katılamayacak.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Yasaklama Sebebi <span className="text-gray-500">(opsiyonel)</span>
          </label>
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sebep belirtin..."
            maxLength={500}
            rows={3}
            className="w-full p-3 rounded-lg bg-surface-2 text-white border border-border-light focus:border-red-500 focus:ring-2 focus:ring-red-500/30 outline-none resize-none text-sm placeholder-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{reason.length}/500</p>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-surface-3 hover:bg-surface-4 rounded-lg transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition"
            >
              {loading ? "Yasaklanıyor..." : "Yasakla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Üye Kontekst Menüsü (Portal) ── */
function MemberContextMenu({ pos, userId, name, roles, currentRoleId, currentRoleIds = [], roleDropdown, setRoleDropdown, onChangeRole, onToggleRole, onKick, onBan, onTimeout, onClose }) {
  const popupRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState(pos);
  const [timeoutOpen, setTimeoutOpen] = useState(false);

  // Viewport taşma kontrolü
  useEffect(() => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    let { top, left } = pos;
    // Alttan taşıyorsa yukarı kaydır
    if (top + rect.height > window.innerHeight - 8) {
      top = window.innerHeight - rect.height - 8;
    }
    // Sağdan taşıyorsa sola kaydır
    if (left + rect.width > window.innerWidth - 8) {
      left = window.innerWidth - rect.width - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    setAdjustedPos({ top, left });
  }, [pos]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const assignableRoles = roles.filter((r) => !r.managed);

  return (
    <div
      ref={popupRef}
      style={{ position: "fixed", top: adjustedPos.top, left: adjustedPos.left, zIndex: 99999 }}
      className="w-44 bg-surface-1 border border-border-light rounded-lg shadow-xl py-1 max-h-[calc(100vh-16px)] overflow-y-auto"
    >
      {/* Rol Değiştir */}
      <div className="relative">
        <button
          onClick={() => setRoleDropdown(roleDropdown === userId ? null : userId)}
          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-surface-4 hover:text-white transition flex items-center justify-between"
        >
          Rol Değiştir
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        {roleDropdown === userId && (
          <RoleSubMenu
            popupRef={popupRef}
            assignableRoles={assignableRoles}
            currentRoleId={currentRoleId}
            currentRoleIds={currentRoleIds}
            userId={userId}
            onChangeRole={onChangeRole}
            onToggleRole={onToggleRole}
          />
        )}
      </div>

      <div className="border-t border-border-light my-1" />

      {/* Timeout */}
      <div className="relative">
        <button
          onClick={() => setTimeoutOpen((p) => !p)}
          className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20 transition flex items-center justify-between"
        >
          Zaman Aşımı
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        {timeoutOpen && (
          <div className="absolute left-full top-0 ml-1 bg-surface-1 border border-border-light rounded-lg shadow-xl py-1 w-36 z-10">
            {[{m:1,l:"1 dakika"},{m:5,l:"5 dakika"},{m:10,l:"10 dakika"},{m:60,l:"1 saat"},{m:1440,l:"1 gün"},{m:10080,l:"1 hafta"}].map((o) => (
              <button key={o.m} onClick={() => { onTimeout(userId, o.m); onClose(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-4 transition">{o.l}</button>
            ))}
          </div>
        )}
      </div>

      {/* At */}
      <button
        onClick={() => onKick(userId, name)}
        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition"
      >
        Sunucudan At
      </button>

      {/* Yasakla */}
      <button
        onClick={() => onBan(userId, name)}
        className="w-full text-left px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/20 transition font-medium"
      >
        Yasakla (Ban)
      </button>
    </div>
  );
}

/* ── Rol alt menüsü — sığmazsa sola açılır ── */
function RoleSubMenu({ popupRef, assignableRoles, currentRoleId, currentRoleIds = [], userId, onChangeRole, onToggleRole }) {
  const subRef = useRef(null);
  const [side, setSide] = useState("right");

  useEffect(() => {
    if (!popupRef.current) return;
    const parentRect = popupRef.current.getBoundingClientRect();
    const subWidth = 176 + 4; // w-44 = 176px + ml-1
    if (parentRect.right + subWidth > window.innerWidth - 8) {
      setSide("left");
    } else {
      setSide("right");
    }
  }, [popupRef]);

  return (
    <div
      ref={subRef}
      className={`absolute top-0 w-44 bg-surface-1 border border-border-light rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto ${
        side === "right" ? "left-full ml-1" : "right-full mr-1"
      }`}
    >
      {assignableRoles.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-500">Atanabilir rol yok</div>
      ) : (
        assignableRoles.map((r) => {
          const hasRole = currentRoleIds.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => onToggleRole ? onToggleRole(userId, r.id, currentRoleIds) : onChangeRole(userId, r.id)}
              className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2 ${
                hasRole
                  ? "text-accent-light bg-accent/10"
                  : "text-gray-300 hover:bg-surface-4 hover:text-white"
              }`}
            >
              <input type="checkbox" checked={hasRole} readOnly className="accent-accent w-3.5 h-3.5 pointer-events-none" />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || "#99AAB5" }} />
              {r.name}
            </button>
          );
        })
      )}
    </div>
  );
}

/* ── Davetler ── */
function InvitesTab({ serverId }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await serverApi.listInvites(serverId);
      setInvites(data || []);
    } catch {}
    setLoading(false);
  }, [serverId]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const createInvite = async () => {
    setCreating(true);
    try {
      await serverApi.createInvite(serverId);
      fetchInvites();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (id) => {
    try {
      await serverApi.deleteInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Davetler</h2>
        <button
          onClick={createInvite}
          disabled={creating}
          className="px-4 py-2 rounded-md bg-accent hover:bg-accent-dark text-white text-sm transition disabled:opacity-60"
        >
          {creating ? "..." : "Davet Oluştur"}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yükleniyor...</div>
      ) : invites.length === 0 ? (
        <div className="text-gray-400 text-sm">Aktif davet kodu yok.</div>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border-light">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-accent-light text-sm font-mono">{inv.code}</code>
                  <button
                    onClick={() => copyCode(inv.code)}
                    className="text-gray-400 hover:text-white transition"
                    title="Kopyala"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {inv.uses ?? 0} kullanım
                  {inv.maxUses > 0 && ` / ${inv.maxUses}`}
                  {inv.creatorName && ` — ${inv.creatorName}`}
                </div>
              </div>
              <button
                onClick={() => deleteInvite(inv.id)}
                className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-surface-4 transition"
                title="Sil"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Kanallar ── */
function ChannelsTab({ serverId }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const musicRef = useRef(null);

  // Kategori yönetimi
  const [serverData, setServerData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [editCatId, setEditCatId] = useState(null);
  const [editCatName, setEditCatName] = useState("");

  const fetchServer = useCallback(async () => {
    try {
      const sv = await serverApi.get(serverId);
      setServerData(sv);
      const cats = JSON.parse(sv.categoriesJson || "[]");
      setCategories(cats);
    } catch {}
  }, [serverId]);

  const saveCategories = async (cats) => {
    setCategories(cats);
    try {
      await http.put(`/api/servers/${serverId}/categories`, JSON.stringify(cats), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) { console.error("Category save error:", e); }
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const maxPos = categories.reduce((m, c) => Math.max(m, c.position || 0), 0);
    saveCategories([...categories, { id: "cat_" + Date.now(), name: newCatName.trim(), position: maxPos + 1 }]);
    setNewCatName("");
  };

  const renameCategory = (catId) => {
    if (!editCatName.trim()) { setEditCatId(null); return; }
    saveCategories(categories.map((c) => c.id === catId ? { ...c, name: editCatName.trim() } : c));
    setEditCatId(null);
  };

  const deleteCategory = (catId) => {
    saveCategories(categories.filter((c) => c.id !== catId));
    // Kategorideki kanalları kategorisiz yap — backend'de channel.categoryId NULL kalır
  };

  // İzinler state (açılan kanal için)
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await serverApi.channels(serverId);
      // Thread kanallarını filtrele — onlar Konular tab'ında gösterilir
      setChannels((data || []).filter((ch) => ch.type !== "THREAD"));
    } catch {} finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetchChannels(); fetchServer(); }, [fetchChannels, fetchServer]);

  // Kanal açıldığında izinleri yükle
  useEffect(() => {
    if (!expandedId) return;
    setPermLoading(true);
    Promise.all([
      serverApi.listRoles(serverId),
      serverApi.getChannelPermissions(expandedId).catch(() => []),
    ]).then(([roleList, permList]) => {
      const filtered = (roleList || []).filter((r) => !r.managed);
      setRoles(filtered);
      const permMap = {};
      for (const p of permList) permMap[p.roleId] = { canRead: p.canRead, canWrite: p.canWrite, canManage: p.canManage };
      setPerms(filtered.map((r) => ({
        roleId: r.id,
        canRead: permMap[r.id]?.canRead ?? true,
        canWrite: permMap[r.id]?.canWrite ?? true,
        canManage: permMap[r.id]?.canManage ?? false,
      })));
    }).finally(() => setPermLoading(false));
  }, [expandedId, serverId]);

  const togglePerm = (roleId, field) => {
    setPerms((prev) => prev.map((p) => (p.roleId === roleId ? { ...p, [field]: !p[field] } : p)));
  };

  const savePerms = async () => {
    if (!expandedId) return;
    setPermSaving(true);
    try {
      await serverApi.setChannelPermissions(expandedId, perms);
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
    setPermSaving(false);
  };

  const toggleExpand = (chId) => {
    setExpandedId((prev) => prev === chId ? null : chId);
  };

  const handleRename = async (ch) => {
    if (!editName.trim() || editName.trim() === ch.title) { setEditingId(null); return; }
    try {
      await serverApi.renameChannel(ch.id, editName.trim());
      setChannels((prev) => prev.map((c) => c.id === ch.id ? { ...c, title: editName.trim() } : c));
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await serverApi.deleteChannel(deleteTarget.id);
      setChannels((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (expandedId === deleteTarget.id) setExpandedId(null);
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
    setDeleteTarget(null);
  };

  const handleMusicUpload = async (e, channelId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(channelId);
    try {
      const updated = await serverApi.uploadChannelMusic(channelId, file);
      setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, bgMusicUrl: updated?.bgMusicUrl || "uploaded" } : c));
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
    setUploading(null);
    if (musicRef.current) musicRef.current.value = "";
  };

  const handleMusicDelete = async (channelId) => {
    try {
      await serverApi.deleteChannelMusic(channelId);
      setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, bgMusicUrl: null } : c));
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const typeIcon = (type) => {
    if (type === "VOICE" || type === "VIDEO") return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-gray-400 shrink-0">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    );
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-400 shrink-0" fill="none">
        <path d="M3 2.5h10M3 2.5v2M13 2.5v2M8 2.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    );
  };

  const getRoleName = (roleId) => roles.find((r) => r.id === roleId)?.name || "?";
  const getRoleColor = (roleId) => roles.find((r) => r.id === roleId)?.color || "#99aab5";

  if (loading) return <div className="text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Kanallar</h2>

      {/* Kategori Yönetimi */}
      <div className="mb-6 p-4 bg-surface-2 rounded-xl border border-border-light">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Kategoriler</h3>
        <div className="space-y-1.5 mb-3">
          {categories.length === 0 && <div className="text-xs text-gray-500">Kategori yok — tüm kanallar "Genel" altında görünür</div>}
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-3">
              {editCatId === cat.id ? (
                <input autoFocus value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") renameCategory(cat.id); if (e.key === "Escape") setEditCatId(null); }}
                  onBlur={() => renameCategory(cat.id)}
                  className="flex-1 bg-surface-4 rounded px-2 py-1 text-sm text-white outline-none border border-accent"
                />
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-200">{cat.name}</span>
                  <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); }}
                    className="text-gray-500 hover:text-white text-xs">Düzenle</button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="text-gray-500 hover:text-rose-400 text-xs">Sil</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="Yeni kategori adı..."
            className="flex-1 bg-surface-3 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none border border-border-light focus:border-accent"
          />
          <button onClick={addCategory} disabled={!newCatName.trim()}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-dark disabled:opacity-50">
            Ekle
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {channels.map((ch, chIdx) => {
          const isExpanded = expandedId === ch.id;
          return (
            <div
              key={ch.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(chIdx)); e.currentTarget.style.opacity = "0.5"; }}
              onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; e.currentTarget.classList.add("ring-1", "ring-accent/50"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("ring-1", "ring-accent/50"); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-1", "ring-accent/50");
                const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                const toIdx = chIdx;
                if (fromIdx === toIdx || isNaN(fromIdx)) return;
                const reordered = [...channels];
                const [moved] = reordered.splice(fromIdx, 1);
                reordered.splice(toIdx, 0, moved);
                setChannels(reordered);
                const items = reordered.map((c, i) => ({ channelId: c.id, position: i, categoryId: c.categoryId }));
                try { await serverApi.reorderChannels(serverId, items); } catch {}
              }}
              className={`rounded-lg border transition ${isExpanded ? "bg-surface-2 border-border-light" : "bg-surface-3 border-border-light/50"}`}
            >
              {/* Kanal satırı */}
              <div className="flex items-center gap-3 px-3 py-2.5 group cursor-pointer" onClick={() => editingId !== ch.id && toggleExpand(ch.id)}>
                {/* Sürükleme tutamacı */}
                <div className="shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition" title="Sürükle">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><circle cx="5" cy="3" r="1.2"/><circle cx="11" cy="3" r="1.2"/><circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/><circle cx="5" cy="13" r="1.2"/><circle cx="11" cy="13" r="1.2"/></svg>
                </div>
                {typeIcon(ch.type)}

                {editingId === ch.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(ch); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={() => handleRename(ch)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-surface-2 text-white text-sm px-2 py-1 rounded border border-accent outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-200 truncate">{ch.title}</span>
                )}

                {/* Müzik badge */}
                {ch.bgMusicUrl && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3 h-3"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </span>
                )}

                {/* Aksiyonlar */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditingId(ch.id); setEditName(ch.title); }} className="p-1 rounded hover:bg-surface-5 text-gray-500 hover:text-white transition" title="Yeniden adlandır">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(ch)} className="p-1 rounded hover:bg-rose-500/15 text-gray-500 hover:text-rose-400 transition" title="Kanalı sil">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4m2 0v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4h9.34z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>

                {/* Chevron */}
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                  <path d="M6 4l4 4-4 4"/>
                </svg>
              </div>

              {/* Genişletilmiş ayarlar */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border-light/30 mt-0">
                  {/* Kanal konusu */}
                  <div className="mt-3 mb-4">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Kanal Konusu</div>
                    <div className="flex gap-2">
                      <input
                        defaultValue={ch.topic || ""}
                        placeholder="Kanal konusu yazin..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val === (ch.topic || "")) return;
                          try {
                            await serverApi.patchChannel(ch.id, { topic: val || null });
                            setChannels((prev) => prev.map((c) => c.id === ch.id ? { ...c, topic: val || null } : c));
                          } catch {}
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                        className="flex-1 bg-surface-3 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none border border-border-light focus:border-accent"
                      />
                    </div>
                  </div>
                  {/* Müzik ayarları (sadece text kanalları) */}
                  {(ch.type === "TEXT" || ch.type === "GUILD") && (
                    <div className="mt-3 mb-4">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Arka Plan Müziği</div>
                      {ch.bgMusicUrl ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            Müzik yüklendi
                          </span>
                          <button onClick={() => handleMusicDelete(ch.id)} className="text-xs text-rose-400 hover:text-rose-300 transition">Kaldır</button>
                          <button onClick={() => { setUploading(ch.id); setTimeout(() => musicRef.current?.click(), 50); }} className="text-xs text-gray-400 hover:text-gray-200 transition">Değiştir</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setUploading(ch.id); setTimeout(() => musicRef.current?.click(), 50); }}
                          className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1.5"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                          Müzik Yükle
                        </button>
                      )}
                    </div>
                  )}

                  {/* İzinler */}
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">İzinler</div>
                  {permLoading ? (
                    <div className="text-gray-500 text-sm py-2">Yükleniyor...</div>
                  ) : roles.length === 0 ? (
                    <div className="text-gray-500 text-sm py-2">Rol bulunamadı</div>
                  ) : (
                    <>
                      {/* Tablo başlığı */}
                      <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-gray-500 uppercase tracking-wider">
                        <span className="flex-1">Rol</span>
                        <span className="w-14 text-center">Gör</span>
                        <span className="w-14 text-center">Yaz</span>
                        <span className="w-14 text-center">Yönet</span>
                      </div>
                      <div className="space-y-0.5">
                        {perms.map((p) => (
                          <div key={p.roleId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-4/50 transition">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getRoleColor(p.roleId) }} />
                              <span className="text-[13px] text-gray-200 truncate">{getRoleName(p.roleId)}</span>
                            </div>
                            {["canRead", "canWrite", "canManage"].map((field) => (
                              <div key={field} className="w-14 flex justify-center">
                                <button
                                  onClick={() => togglePerm(p.roleId, field)}
                                  className={`w-8 h-[18px] rounded-full transition-colors relative ${p[field] ? (field === "canManage" ? "bg-amber-500" : "bg-emerald-500") : "bg-surface-6"}`}
                                >
                                  <div className={`w-3 h-3 rounded-full bg-white absolute top-[3px] transition-transform ${p[field] ? "translate-x-[14px]" : "translate-x-[3px]"}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={savePerms}
                          disabled={permSaving}
                          className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg font-medium disabled:opacity-40 transition"
                        >
                          {permSaving ? "Kaydediliyor..." : "İzinleri Kaydet"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {channels.length === 0 && <div className="text-gray-500 text-sm mt-4">Henüz kanal yok.</div>}

      <input ref={musicRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleMusicUpload(e, uploading)} />

      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="bg-surface-2 border border-border-light rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Kanalı Sil</h3>
            <p className="text-gray-400 text-sm mb-4">
              <span className="text-white font-medium">"{deleteTarget.title}"</span> kanalını silmek istediğinizden emin misiniz? Tüm mesajlar ve ayarlar silinecek.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded text-sm bg-surface-3 text-gray-300 hover:bg-surface-5">Vazgeç</button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded text-sm bg-rose-600 text-white hover:bg-rose-500">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Placeholder ── */
/* ── Yasaklılar (Ban List) ── */
function BansTab({ serverId }) {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBans = useCallback(async () => {
    try {
      const data = await http.get(`/api/servers/${serverId}/members/bans`);
      setBans(data.data || []);
    } catch {} finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetchBans(); }, [fetchBans]);

  const handleUnban = async (userId, name) => {
    if (!confirm(`${name} adlı kullanıcının yasağını kaldırmak istiyor musunuz?`)) return;
    try {
      await http.delete(`/api/servers/${serverId}/members/bans/${userId}`);
      fetchBans();
    } catch (e) { toast.error(e.response?.data?.error || e.message); }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Yasaklı Üyeler</h2>
      {loading ? <div className="text-gray-400 text-sm">Yükleniyor...</div> :
       bans.length === 0 ? (
        <div className="p-8 rounded-lg bg-surface-2 border border-border-light text-center">
          <div className="text-gray-500 text-sm">Yasaklı üye yok</div>
        </div>
      ) : (
        <div className="space-y-2">
          {bans.map((b) => (
            <div key={b.userId} className="flex items-center gap-3 px-4 py-3 bg-surface-2 rounded-lg border border-border-light">
              <div className="w-10 h-10 rounded-full bg-surface-4 overflow-hidden shrink-0">
                {b.avatarUrl ? <img src={b.avatarUrl} className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">{b.displayName?.[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">{b.displayName}</div>
                <div className="text-[11px] text-gray-500">@{b.username}</div>
                {b.reason && <div className="text-xs text-gray-400 mt-0.5">Sebep: {b.reason}</div>}
                <div className="text-[10px] text-gray-600">
                  {new Date(b.bannedAt).toLocaleDateString("tr-TR")} — {b.bannedBy} tarafından
                </div>
              </div>
              <button onClick={() => handleUnban(b.userId, b.displayName)}
                className="px-3 py-1.5 rounded-lg bg-surface-4 text-sm text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition shrink-0">
                Yasağı Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Denetim Kaydı ── */
const ACTION_LABELS = {
  MEMBER_KICK: { label: "Üye Atıldı", icon: "×", color: "text-rose-400" },
  MEMBER_BAN: { label: "Üye Yasaklandı", icon: "⛔", color: "text-rose-500" },
  MEMBER_UNBAN: { label: "Yasak Kaldırıldı", icon: "✓", color: "text-emerald-400" },
  MEMBER_TIMEOUT: { label: "Zaman Aşımı", icon: "⏱", color: "text-amber-400" },
  MEMBER_TIMEOUT_REMOVE: { label: "Zaman Aşımı Kaldırıldı", icon: "✓", color: "text-emerald-400" },
  AUTO_MOD_TIMEOUT: { label: "Otomatik Moderasyon", icon: "⚡", color: "text-amber-400" },
  MEMBER_ROLE_UPDATE: { label: "Rol Değiştirildi", icon: "◆", color: "text-blue-400" },
  ROLE_CREATE: { label: "Rol Oluşturuldu", icon: "+", color: "text-emerald-400" },
  ROLE_UPDATE: { label: "Rol Güncellendi", icon: "✎", color: "text-blue-400" },
  ROLE_DELETE: { label: "Rol Silindi", icon: "−", color: "text-rose-400" },
  CHANNEL_CREATE: { label: "Kanal Oluşturuldu", icon: "+", color: "text-emerald-400" },
  CHANNEL_DELETE: { label: "Kanal Silindi", icon: "−", color: "text-rose-400" },
  SERVER_UPDATE: { label: "Sunucu Güncellendi", icon: "⚙", color: "text-blue-400" },
};

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "MEMBER_KICK", label: "Atılma" },
  { value: "MEMBER_BAN", label: "Yasaklama" },
  { value: "MEMBER_UNBAN", label: "Yasak Kaldırma" },
  { value: "MEMBER_TIMEOUT", label: "Zaman Aşımı" },
  { value: "MEMBER_ROLE_UPDATE", label: "Rol Değişikliği" },
  { value: "ROLE_CREATE", label: "Rol Oluşturma" },
  { value: "ROLE_UPDATE", label: "Rol Güncelleme" },
  { value: "ROLE_DELETE", label: "Rol Silme" },
  { value: "CHANNEL_CREATE", label: "Kanal Oluşturma" },
  { value: "CHANNEL_DELETE", label: "Kanal Silme" },
];

function fmtAuditTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return ""; }
}

function AuditTab({ serverId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const data = await serverApi.getAuditLogs(serverId, {
        page: p,
        size: 50,
        action: actionFilter || undefined,
      });
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setPage(data.page || 0);
    } catch (e) {
      console.error("Audit logs error:", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [serverId, actionFilter]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Denetim Kaydı</h2>

      {/* Filtre */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-surface-3 border border-border-light rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-accent"
        >
          {ACTION_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={() => load(0)}
          className="px-3 py-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 transition"
        >
          Yenile
        </button>
      </div>

      {/* Log listesi */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 rounded-lg bg-surface-2 border border-border-light text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-10 h-10 mx-auto text-gray-500 mb-3">
            <path d="M9 12h6M9 16h6M5 8h14M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
          <div className="text-gray-400 text-sm">Henüz denetim kaydı yok</div>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const info = ACTION_LABELS[log.action] || { label: log.action, icon: "•", color: "text-gray-400" };
            const actor = log.actor;
            const target = log.targetUser;
            return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-surface-2 border border-border-light/50 hover:bg-surface-3/50 transition">
                {/* İkon */}
                <span className="text-lg shrink-0 mt-0.5">{info.icon}</span>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
                    {log.targetName && (
                      <span className="text-sm text-gray-300">— {log.targetName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-500">
                    {actor && (
                      <>
                        <img src={actor.avatarUrl || ""} alt="" className="w-4 h-4 rounded-full bg-surface-5"
                          onError={(e) => { e.target.style.display = "none"; }} />
                        <span className="text-gray-400">{actor.displayName || actor.username}</span>
                      </>
                    )}
                    {target && (
                      <>
                        <span className="text-gray-600">→</span>
                        <span className="text-gray-400">{target.displayName || target.username}</span>
                      </>
                    )}
                  </div>
                  {log.details && (
                    <div className="text-[11px] text-gray-500 mt-1">{log.details}</div>
                  )}
                </div>

                {/* Zaman */}
                <span className="text-[11px] text-gray-600 shrink-0 mt-1">{fmtAuditTime(log.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page === 0}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Önceki
          </button>
          <span className="text-[12px] text-gray-500">{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Moderasyon (Otomatik Mod) ── */
const DEFAULT_AUTOMOD = {
  badWords: { enabled: false, action: "TIMEOUT", timeoutMinutes: 5, words: [] },
  spam: { enabled: false, action: "TIMEOUT", timeoutMinutes: 5, maxMessages: 5, windowSeconds: 10 },
  capsLock: { enabled: false, action: "TIMEOUT", timeoutMinutes: 2, minLength: 8, threshold: 70 },
  linkSpam: { enabled: false, action: "TIMEOUT", timeoutMinutes: 5, maxLinks: 3 },
  mentionSpam: { enabled: false, action: "TIMEOUT", timeoutMinutes: 5, maxMentions: 5 },
  repeat: { enabled: false, action: "TIMEOUT", timeoutMinutes: 3, maxRepeat: 3 },
};

const RULE_META = [
  { key: "badWords", icon: "⛔", title: "Yasak Kelime Filtresi", desc: "Belirli kelimeleri içeren mesajları engeller" },
  { key: "spam", icon: "⚡", title: "Spam Koruması", desc: "Kısa sürede çok fazla mesaj göndermeyi engeller" },
  { key: "capsLock", icon: "Aa", title: "Caps Lock Koruması", desc: "Çoğunluğu büyük harf olan mesajları engeller" },
  { key: "linkSpam", icon: "∞", title: "Link Spam Koruması", desc: "Tek mesajda çok fazla link paylaşmayı engeller" },
  { key: "mentionSpam", icon: "@", title: "Etiket Spam Koruması", desc: "Tek mesajda çok fazla kişi etiketlemeyi engeller" },
  { key: "repeat", icon: "↻", title: "Tekrar Mesaj Koruması", desc: "Aynı mesajı art arda göndermeyi engeller" },
];

const TIMEOUT_PRESETS = [
  { label: "1 dk", value: 1 },
  { label: "5 dk", value: 5 },
  { label: "10 dk", value: 10 },
  { label: "30 dk", value: 30 },
  { label: "1 saat", value: 60 },
  { label: "1 gün", value: 1440 },
];

function ModerationTab({ serverId }) {
  const [config, setConfig] = useState(DEFAULT_AUTOMOD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newWord, setNewWord] = useState("");

  useEffect(() => {
    setLoading(true);
    http.get(`/api/servers/${serverId}/automod`)
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          setConfig((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverId]);

  const save = async () => {
    setSaving(true);
    try {
      await http.put(`/api/servers/${serverId}/automod`, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error("Kaydetme hatasi: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (key, field, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const addWord = () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    const words = config.badWords?.words || [];
    if (words.includes(w)) { setNewWord(""); return; }
    updateRule("badWords", "words", [...words, w]);
    setNewWord("");
  };

  const removeWord = (word) => {
    updateRule("badWords", "words", (config.badWords?.words || []).filter((w) => w !== word));
  };

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Otomatik Moderasyon</h2>
          <p className="text-sm text-gray-400 mt-1">Kuralları ihlal eden üyelere otomatik timeout uygulanır</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            saved ? "bg-emerald-600 text-white" : "bg-accent hover:bg-accent-dark text-white"
          } disabled:opacity-50`}
        >
          {saving ? "Kaydediliyor..." : saved ? "Kaydedildi!" : "Kaydet"}
        </button>
      </div>

      <div className="space-y-4">
        {RULE_META.map(({ key, icon, title, desc }) => {
          const rule = config[key] || {};
          const enabled = rule.enabled || false;
          return (
            <div key={key} className={`rounded-xl border transition ${enabled ? "bg-surface-2 border-accent/30" : "bg-surface-2/50 border-border-light/50"}`}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{title}</div>
                  <div className="text-[12px] text-gray-500">{desc}</div>
                </div>
                <button
                  onClick={() => updateRule(key, "enabled", !enabled)}
                  className={`relative w-11 h-6 rounded-full transition ${enabled ? "bg-accent" : "bg-surface-5"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              {/* Ayarlar — sadece açıksa */}
              {enabled && (
                <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3">
                  {/* Timeout süresi */}
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wide">Timeout Süresi</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {TIMEOUT_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => updateRule(key, "timeoutMinutes", p.value)}
                          className={`px-2.5 py-1 rounded-lg text-[12px] transition ${
                            (rule.timeoutMinutes || 5) === p.value
                              ? "bg-accent text-white" : "bg-surface-3 text-gray-300 hover:bg-surface-4"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kural-spesifik ayarlar */}
                  {key === "badWords" && (
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase tracking-wide">Yasak Kelimeler</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          value={newWord}
                          onChange={(e) => setNewWord(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addWord()}
                          placeholder="Kelime ekle..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none focus:border-accent"
                        />
                        <button onClick={addWord} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm">Ekle</button>
                      </div>
                      {(rule.words || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(rule.words || []).map((w) => (
                            <span key={w} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[12px]">
                              {w}
                              <button onClick={() => removeWord(w)} className="hover:text-white">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {key === "spam" && (
                    <div className="flex gap-4">
                      <div>
                        <label className="text-[11px] text-gray-500 uppercase tracking-wide">Maks Mesaj</label>
                        <input type="number" min={2} max={20} value={rule.maxMessages || 5}
                          onChange={(e) => updateRule(key, "maxMessages", parseInt(e.target.value) || 5)}
                          className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 uppercase tracking-wide">Süre (sn)</label>
                        <input type="number" min={3} max={60} value={rule.windowSeconds || 10}
                          onChange={(e) => updateRule(key, "windowSeconds", parseInt(e.target.value) || 10)}
                          className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {key === "capsLock" && (
                    <div className="flex gap-4">
                      <div>
                        <label className="text-[11px] text-gray-500 uppercase tracking-wide">Min Karakter</label>
                        <input type="number" min={3} max={50} value={rule.minLength || 8}
                          onChange={(e) => updateRule(key, "minLength", parseInt(e.target.value) || 8)}
                          className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 uppercase tracking-wide">Eşik (%)</label>
                        <input type="number" min={50} max={100} value={rule.threshold || 70}
                          onChange={(e) => updateRule(key, "threshold", parseInt(e.target.value) || 70)}
                          className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {key === "linkSpam" && (
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase tracking-wide">Maks Link Sayısı</label>
                      <input type="number" min={1} max={20} value={rule.maxLinks || 3}
                        onChange={(e) => updateRule(key, "maxLinks", parseInt(e.target.value) || 3)}
                        className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                      />
                    </div>
                  )}

                  {key === "mentionSpam" && (
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase tracking-wide">Maks Etiket Sayısı</label>
                      <input type="number" min={1} max={20} value={rule.maxMentions || 5}
                        onChange={(e) => updateRule(key, "maxMentions", parseInt(e.target.value) || 5)}
                        className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                      />
                    </div>
                  )}

                  {key === "repeat" && (
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase tracking-wide">Maks Tekrar</label>
                      <input type="number" min={2} max={10} value={rule.maxRepeat || 3}
                        onChange={(e) => updateRule(key, "maxRepeat", parseInt(e.target.value) || 3)}
                        className="mt-1 w-20 px-2 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaceholderTab({ title }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="p-8 rounded-lg bg-surface-2 border border-border-light text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-12 h-12 mx-auto text-gray-500 mb-3">
          <path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />
        </svg>
        <div className="text-gray-400 text-sm">Bu özellik yakında eklenecek.</div>
      </div>
    </div>
  );
}

/* ── Tema ── */
function ThemeTab({ server, onUpdate }) {
  const bgFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [themeState, setThemeState] = useState(() => {
    try { return JSON.parse(server?.themeJson || "{}"); } catch { return {}; }
  });

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

  const uploadBg = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !server?.id) return;
    setUploading(true);
    try {
      const updated = await serverApi.uploadChatBackground(server.id, file);
      onUpdate?.(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
      if (bgFileRef.current) bgFileRef.current.value = "";
    }
  };

  const deleteBg = async () => {
    if (!server?.id) return;
    try {
      const updated = await serverApi.deleteChatBackground(server.id);
      onUpdate?.(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const saveTheme = async (updates) => {
    const newTheme = { ...themeState, ...updates };
    setThemeState(newTheme);
    try {
      const updated = await serverApi.updateTheme(server.id, JSON.stringify(newTheme));
      onUpdate?.(updated);
    } catch (err) {
      console.error("Theme save error:", err);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Sunucu Teması</h2>

      {/* Chat Arka Planı */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Chat Arka Planı</label>
        <p className="text-xs text-gray-500 mb-3">Resim veya GIF yükleyin. Tüm üyeler bu arka planı görecek.</p>

        {server?.chatBackgroundUrl ? (
          <div className="mb-3">
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
              <img src={server.chatBackgroundUrl} alt="bg" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-surface-2/60" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => bgFileRef.current?.click()}
                  className="px-3 py-1 rounded bg-surface-4 text-white text-xs hover:bg-surface-5 transition"
                >
                  Değiştir
                </button>
                <button
                  onClick={deleteBg}
                  className="px-3 py-1 rounded bg-rose-600 text-white text-xs hover:bg-rose-700 transition"
                >
                  Kaldır
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => bgFileRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 rounded-lg border-2 border-dashed border-border-light hover:border-accent/40 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            <span className="text-sm">{uploading ? "Yükleniyor..." : "Resim veya GIF Yükle"}</span>
          </button>
        )}
        <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={uploadBg} />
      </div>

      {/* Vurgu Rengi */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Vurgu Rengi</label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.color}
              onClick={() => saveTheme({ accentColor: p.color })}
              className={`w-8 h-8 rounded-full border-2 transition ${
                themeState.accentColor === p.color ? "border-white scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: p.color }}
              title={p.label}
            />
          ))}
          <label className="w-8 h-8 rounded-full border-2 border-dashed border-border-light flex items-center justify-center cursor-pointer hover:border-accent/40 transition" title="Özel renk">
            <input
              type="color"
              value={themeState.accentColor || "#10b981"}
              onChange={(e) => saveTheme({ accentColor: e.target.value })}
              className="sr-only"
            />
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500" fill="currentColor">
              <circle cx="8" cy="8" r="3" />
            </svg>
          </label>
        </div>
      </div>

      {/* Arka Plan Opaklığı */}
      <div className="mb-8">
        <label className="text-sm text-gray-300 mb-2 block">Mesaj Opaklığı</label>
        <p className="text-xs text-gray-500 mb-2">Arka plan görselinin ne kadar görüneceğini ayarlayın.</p>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round((themeState.opacity ?? 0.85) * 100)}
          onChange={(e) => saveTheme({ opacity: parseInt(e.target.value) / 100 })}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Koyu</span>
          <span>%{Math.round((themeState.opacity ?? 0.85) * 100)}</span>
          <span>Açık</span>
        </div>
      </div>
    </div>
  );
}

/* ── Konular (Forum Kanalları) ── */
function TopicsTab({ serverId }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchTopics = useCallback(async () => {
    try {
      const data = await serverApi.channels(serverId);
      setTopics((data || []).filter((ch) => ch.type === "THREAD"));
    } catch {} finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  const createTopic = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const created = await serverApi.createChannel(serverId, { title: newTitle.trim(), type: "THREAD" });
      setTopics((prev) => [...prev, created]);
      setNewTitle("");
      toast.success("Konu oluşturuldu");
    } catch (e) { toast.error(e?.response?.data?.message || "Oluşturulamadı"); }
    finally { setCreating(false); }
  };

  const deleteTopic = async () => {
    if (!deleteTarget) return;
    try {
      await serverApi.deleteChannel(deleteTarget.id);
      setTopics((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Konu silindi");
    } catch (e) { toast.error(e?.response?.data?.message || "Silinemedi"); }
    setDeleteTarget(null);
  };

  if (loading) return <div className="text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">Konular</h2>
      <p className="text-sm text-gray-400 mb-4">Forum tarzı konu kanalları. Her konu kendi mesaj akışına sahiptir.</p>

      {/* Yeni konu oluştur */}
      <div className="flex gap-2 mb-6">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTopic()}
          placeholder="Yeni konu başlığı..."
          className="flex-1 bg-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none border border-border-light focus:border-accent"
        />
        <button
          onClick={createTopic}
          disabled={!newTitle.trim() || creating}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-medium disabled:opacity-50 transition"
        >
          {creating ? "..." : "+ Konu Oluştur"}
        </button>
      </div>

      {/* Konu kartları */}
      {topics.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-surface-4 grid place-items-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-500">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-gray-400 text-sm">Henüz konu yok. Bir konu oluşturarak başla!</div>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {topics.map((t) => (
            <div key={t.id} className="bg-surface-3 border border-border-light/50 rounded-xl p-4 hover:border-accent/30 transition group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-5 grid place-items-center shrink-0 mt-0.5">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-accent-light">
                    <path d="M5 1v14M11 1v14M1 5h14M1 11h14" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-white truncate">{t.title || "İsimsiz Konu"}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(t)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 text-gray-500 hover:text-rose-400 transition shrink-0"
                  title="Konuyu sil"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4m2 0v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4h9.34z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Silme onay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="bg-surface-2 border border-border-light rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Konuyu Sil</h3>
            <p className="text-gray-400 text-sm mb-4">
              <span className="text-white font-medium">"{deleteTarget.title}"</span> konusunu silmek istediğinizden emin misiniz? Tüm mesajlar silinecek.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded text-sm bg-surface-3 text-gray-300 hover:bg-surface-5">Vazgeç</button>
              <button onClick={deleteTopic} className="px-3 py-1.5 rounded text-sm bg-rose-600 text-white hover:bg-rose-500">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
