import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useMedia } from "../../context/MediaContext";
import { useAuth } from "../../context/AuthContext";
import { serverApi } from "../../services/serverApi";
import { fetchVoiceParticipants } from "../../services/livekitApi";
import { subscribeTopic, onReconnect } from "../../services/ws";
import { paths } from "../../routes/paths";
import Avatar from "../common/Avatar";
import ParticipantVolumeMenu from "../voice/ParticipantVolumeMenu";
import ConfirmDialog from "../modals/ConfirmDialog";
import { useUnread } from "../../context/UnreadContext";
import toast from "react-hot-toast";

export default function SidebarChannels({ collapsed }) {
  const { activeServerId, activeChannelId, setActiveChannelId, lastVisitedByServer, setLastVisitedByServer,
    serverData, channels: ctxChannels } = useChat();
  const media = useMedia();
  const { user } = useAuth();
  const { getUnread } = useUnread();
  const nav = useNavigate();
  const channels = ctxChannels;
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(null); // null | { x, y, categoryId }
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("TEXT");
  const [newCategoryId, setNewCategoryId] = useState("__default__");
  const [newBotOnly, setNewBotOnly] = useState(false);
  const createRef = useRef(null);
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const inviteRef = useRef(null);
  const [volumeMenu, setVolumeMenu] = useState(null); // { identity, name, avatarUrl, isLocal, x, y }
  const [serverName, setServerName] = useState("");
  const [switchConfirm, setSwitchConfirm] = useState(null); // channelId to switch to

  // Kanal context menü
  const [ctxMenu, setCtxMenu] = useState(null); // { channelId, x, y }
  const [renameTarget, setRenameTarget] = useState(null); // { id, title }
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // channel object
  const ctxRef = useRef(null);
  const musicInputRef = useRef(null);
  const [musicUploadTarget, setMusicUploadTarget] = useState(null); // channelId

  // Ses kanalı katılımcıları: { channelId: [{identity, name, avatarUrl}] }
  const [voiceMembers, setVoiceMembers] = useState({});
  const leaveTimersRef = useRef({}); // grace period timers for participant_left

  const createInvite = async () => {
    if (!activeServerId) return;
    setInviteLoading(true);
    try {
      const data = await serverApi.createInvite(activeServerId);
      setInviteCode(data.code);
      setTimeout(() => inviteRef.current?.select(), 50);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    inviteRef.current?.select();
  };

  // Sunucu değişince ilk kanalı seç
  useEffect(() => {
    if (!activeServerId || channels.length === 0) { setVoiceMembers({}); setServerName(""); return; }
    setServerName(serverData?.name || "");

    // Aktif kanal zaten varsa dokunma
    if (activeChannelId && channels.some((ch) => ch.id === activeChannelId)) return;

    // Son ziyaret edilen kanalı geri yükle
    const lastChId = lastVisitedByServer[activeServerId];
    const lastCh = lastChId && channels.find((ch) => ch.id === lastChId);
    if (lastCh) {
      setActiveChannelId(lastCh.id);
      nav(paths.chat, { replace: true });
      return;
    }

    // Default kanal veya ilk text kanalı
    let target = null;
    if (serverData?.defaultChannelId) {
      target = channels.find((ch) => ch.id === serverData.defaultChannelId);
    }
    if (!target) {
      target = channels.find((ch) => ch.type === "TEXT" || ch.type === "GUILD");
    }
    if (target) setActiveChannelId(target.id);
  }, [activeServerId, channels, serverData]);

  // Tüm text kanallarını dinle — aktif kanal değilse unread artır (anlık)
  // Unread sayaclari UnreadContext'ten geliyor (/user/queue/unread WS event'i)

  // Başlangıçta mevcut katılımcıları bir kez çek
  const fetchAllVoiceParticipants = useCallback(async () => {
    const voiceChs = channels.filter((ch) => ch.type === "VOICE" || ch.type === "VIDEO");
    if (voiceChs.length === 0) return;

    const results = {};
    await Promise.all(
      voiceChs.map(async (ch) => {
        try {
          const participants = await fetchVoiceParticipants(ch.id);
          if (participants.length > 0) results[ch.id] = participants;
        } catch (e) {
          console.warn("Voice participants fetch error:", ch.id, e);
        }
      })
    );
    setVoiceMembers(results);
  }, [channels]);

  // İlk yüklemede bir kez fetch + STOMP ile anlık güncelleme
  useEffect(() => {
    if (channels.length === 0) return;
    fetchAllVoiceParticipants();

    // Her ses kanalı için STOMP subscription
    const voiceChs = channels.filter((ch) => ch.type === "VOICE" || ch.type === "VIDEO");
    const unsubs = voiceChs.map((ch) =>
      subscribeTopic(`/topic/voice.participants.${ch.id}`, (msg) => {
        const { event, identity, name, avatarUrl, channelId } = msg;
        if (!channelId || !identity) return;

        const timerKey = `${channelId}:${identity}`;

        if (event === "participant_joined") {
          // Bekleyen leave timer varsa iptal et (kısa kopma → tekrar bağlandı)
          if (leaveTimersRef.current[timerKey]) {
            clearTimeout(leaveTimersRef.current[timerKey]);
            delete leaveTimersRef.current[timerKey];
          }
          setVoiceMembers((prev) => {
            const existing = prev[channelId] || [];
            if (existing.some((m) => m.identity === identity)) return prev;
            return { ...prev, [channelId]: [...existing, { identity, name, avatarUrl }] };
          });
        } else if (event === "participant_left") {
          // Grace period: 3sn bekle, tekrar joined gelmezse çıkar
          if (leaveTimersRef.current[timerKey]) clearTimeout(leaveTimersRef.current[timerKey]);
          leaveTimersRef.current[timerKey] = setTimeout(() => {
            delete leaveTimersRef.current[timerKey];
            setVoiceMembers((prev) => {
              const existing = prev[channelId] || [];
              const filtered = existing.filter((m) => m.identity !== identity);
              const next = { ...prev };
              if (filtered.length > 0) {
                next[channelId] = filtered;
              } else {
                delete next[channelId];
              }
              return next;
            });
          }, 3000);
        }
      })
    );

    // STOMP reconnect olduğunda katılımcıları yeniden çek
    const unsubReconnect = onReconnect(fetchAllVoiceParticipants);

    // LiveKit'ten gelen anlık katılımcı değişikliği (kendi room'undaki değişiklikler)
    const voiceChIds = new Set(voiceChs.map((ch) => ch.id));
    const onParticipantsChanged = (e) => {
      const { channelId, participants: pList } = e.detail || {};
      if (!channelId || !voiceChIds.has(channelId)) return;
      setVoiceMembers((prev) => {
        if (pList.length === 0) {
          if (!prev[channelId]) return prev;
          const next = { ...prev };
          delete next[channelId];
          return next;
        }
        return { ...prev, [channelId]: pList };
      });
    };
    window.addEventListener("voice-participants-changed", onParticipantsChanged);

    return () => {
      unsubs.forEach((u) => u?.());
      unsubReconnect();
      window.removeEventListener("voice-participants-changed", onParticipantsChanged);
      // Grace period timer'larını temizle
      Object.values(leaveTimersRef.current).forEach(clearTimeout);
      leaveTimersRef.current = {};
    };
  }, [channels, fetchAllVoiceParticipants]);

  // Local kullanıcıyı yönet: bağlıysa veya bağlanıyorsa ekle, değilse çıkar
  // voiceState.channelId → startVoice çağrıldığında hemen set edilir (LiveKit bağlanmadan önce)
  // media.channelId → registerParticipant sonrası set edilir (LiveKit bağlandıktan sonra)
  const localVoiceChId = media.channelId || media.voiceState?.channelId;
  const localInVoice = media.inCall || !!media.voiceState;

  const mergedVoiceMembers = useMemo(() => {
    const merged = {};

    for (const [chId, members] of Object.entries(voiceMembers)) {
      // Kullanıcı artık bu kanalda değilse, API gecikmiş olsa bile hemen çıkar
      if (user && !localInVoice && members.some((m) => m.identity === user.id)) {
        const filtered = members.filter((m) => m.identity !== user.id);
        if (filtered.length > 0) merged[chId] = filtered;
      } else if (user && localInVoice && localVoiceChId !== chId && members.some((m) => m.identity === user.id)) {
        // Başka kanala geçtiyse eski kanaldan çıkar
        const filtered = members.filter((m) => m.identity !== user.id);
        if (filtered.length > 0) merged[chId] = filtered;
      } else {
        merged[chId] = members;
      }
    }

    // Bağlıysa veya bağlanıyorsa kendi kanalına hemen ekle
    if (localInVoice && localVoiceChId && user) {
      const localEntry = {
        identity: user.id,
        name: user.displayName || user.username || "?",
        avatarUrl: user.avatarUrl || null,
      };
      const existing = merged[localVoiceChId] || [];
      if (!existing.some((m) => m.identity === user.id)) {
        merged[localVoiceChId] = [...existing, localEntry];
      }
    }

    return merged;
  }, [voiceMembers, localInVoice, localVoiceChId, user]);

  // Kategorilere göre grupla
  const categories = useMemo(() => {
    let cats = [];
    try { cats = JSON.parse(serverData?.categoriesJson || "[]") || []; } catch {}
    // Varsayılan kategori yoksa oluştur
    if (!cats.length) cats = [{ id: "__default__", name: "Genel", position: 0 }];
    cats.sort((a, b) => (a.position || 0) - (b.position || 0));

    return cats.map((cat) => {
      const catChannels = channels
        .filter((ch) => (ch.categoryId || "__default__") === cat.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      return { ...cat, channels: catChannels };
    });
  }, [channels, serverData?.categoriesJson]);

  const [collapsedCats, setCollapsedCats] = useState({});
  const toggleCat = (catId) => setCollapsedCats((p) => ({ ...p, [catId]: !p[catId] }));

  const textChannels = channels.filter((ch) => (ch.type === "TEXT" || ch.type === "GUILD" || ch.type === "POST") && ch.type !== "THREAD");
  const voiceChannels = channels.filter((ch) => ch.type === "VOICE" || ch.type === "VIDEO");
  const topicChannels = channels.filter((ch) => ch.type === "THREAD" && !ch.parentChannelId);

  const doGoVoice = (chId) => {
    setActiveChannelId(chId);
    nav(paths.voice(chId) + `?channelId=${chId}&mode=audio&source=server`, { replace: true });
  };

  const goChannel = (ch) => {
    // Ses kanalına geçiş: zaten başka bir seslide bağlıysa onay iste
    if ((ch.type === "VOICE" || ch.type === "VIDEO") && media.voiceState && media.voiceState.channelId !== ch.id) {
      setSwitchConfirm(ch.id);
      return;
    }
    setActiveChannelId(ch.id);
    if (ch.type !== "VOICE" && ch.type !== "VIDEO") {
      setLastVisitedByServer((prev) => ({ ...prev, [activeServerId]: ch.id }));
    }
    if (ch.type === "VOICE" || ch.type === "VIDEO") {
      doGoVoice(ch.id);
    } else {
      nav(paths.chat);
      // Seslideyken text kanala tıklayınca chat panelini aç
      window.dispatchEvent(new Event("show-chat-panel"));
    }
  };

  // Context menü dış tıklama
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target)) setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const openCtxMenu = (e, ch) => {
    e.stopPropagation();
    e.preventDefault();
    // Aynı kanala tekrar tıklayınca kapat
    if (ctxMenu?.channelId === ch.id) { setCtxMenu(null); return; }
    const menuH = 120, menuW = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setCtxMenu({ channelId: ch.id, channel: ch, x, y });
  };

  const startRename = (ch) => {
    setCtxMenu(null);
    setRenameTarget({ id: ch.id, title: ch.title });
    setRenameValue(ch.title);
  };

  const submitRename = async () => {
    if (!renameTarget || !renameValue.trim()) { setRenameTarget(null); return; }
    try {
      await serverApi.renameChannel(renameTarget.id, renameValue.trim());
      fetchChannels();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
    setRenameTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await serverApi.deleteChannel(deleteConfirm.id);
      if (activeChannelId === deleteConfirm.id) setActiveChannelId(null);
      fetchChannels();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
    setDeleteConfirm(null);
  };

  const handleMusicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !musicUploadTarget) return;
    try {
      await serverApi.uploadChannelMusic(musicUploadTarget, file);
      fetchChannels();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
    setMusicUploadTarget(null);
    if (musicInputRef.current) musicInputRef.current.value = "";
  };

  const handleMusicDelete = async (channelId) => {
    try {
      await serverApi.deleteChannelMusic(channelId);
      fetchChannels();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const createChannel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await serverApi.createChannel(activeServerId, {
        title: newName.trim(), type: newType,
        categoryId: newCategoryId !== "__default__" ? newCategoryId : null,
        botOnly: newBotOnly || undefined,
      });
      setNewName(""); setNewBotOnly(false);
      setShowCreate(null);
      fetchChannels();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  };

  if (collapsed) {
    return <div className="w-full bg-surface-3 hidden md:block" />;
  }

  return (
    <div className="w-full h-full bg-surface-3 flex flex-col">
    {/* Sunucu başlık barı */}
    <div className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-border">
      <span className="text-white font-semibold text-base truncate">{serverName || "..."}</span>
      <div className="flex items-center gap-1 shrink-0">
        {/* Davet oluştur */}
        {inviteCode ? (
          <div className="flex gap-1 items-center">
            <input
              ref={inviteRef}
              value={inviteCode}
              readOnly
              className="w-20 px-1.5 py-1 rounded bg-surface-2 text-white text-[10px] border border-border-light outline-none font-mono"
              onClick={(e) => e.target.select()}
            />
            <button onClick={copyInvite} className="p-1.5 rounded hover:bg-surface-5 text-gray-300 transition" title="Kopyala">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button onClick={() => setInviteCode("")} className="p-1.5 rounded hover:bg-surface-5 text-gray-300 transition" title="Kapat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={createInvite}
            disabled={inviteLoading}
            className="p-1.5 rounded hover:bg-surface-5 text-gray-400 hover:text-white transition disabled:opacity-60"
            title="Davet kodu oluştur"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
            </svg>
          </button>
        )}
        {/* Ayarlar */}
        <button
          onClick={() => nav(paths.serverSettings)}
          className="p-1.5 rounded hover:bg-surface-5 text-gray-400 hover:text-white transition"
          title="Sunucu ayarları"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>

    <div className="flex-1 p-3 overflow-y-auto">

      {loading ? (
        <div className="text-gray-400 text-xs px-2">Yükleniyor...</div>
      ) : (
        categories.map((cat) => {
          const isCollapsed = collapsedCats[cat.id];
          const catTextChs = cat.channels.filter((ch) => ch.type === "TEXT" || ch.type === "GUILD" || ch.type === "POST");
          const catVoiceChs = cat.channels.filter((ch) => ch.type === "VOICE" || ch.type === "VIDEO");
          const allChs = [...catTextChs, ...catVoiceChs];
          if (allChs.length === 0 && cat.id !== "__default__") return null;

          return (
            <div key={cat.id} className="mb-3">
              {/* Kategori başlığı */}
              <div className="flex items-center justify-between mb-1 group/cat">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition flex-1"
                >
                  <svg viewBox="0 0 10 6" className={`w-2 h-2 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} fill="currentColor"><path d="M0 0l5 5 5-5z"/></svg>
                  <span className="text-[11px] uppercase tracking-wider">{cat.name}</span>
                  <span className="text-[10px] text-gray-600 ml-1">{allChs.length}</span>
                </button>
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setShowCreate({ x: rect.left, y: rect.bottom + 4, categoryId: cat.id });
                    setNewType("TEXT"); setNewCategoryId(cat.id); setNewName(""); setNewBotOnly(false);
                  }}
                  className="text-gray-500 hover:text-white opacity-0 group-hover/cat:opacity-100 transition"
                  title="Kanal ekle"
                ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg></button>
              </div>

              {!isCollapsed && (
                <div className="flex flex-col gap-0.5">
                  {/* Yazı kanalları */}
                  {catTextChs.map((ch) => (
                    <div key={ch.id} className="group/ch flex items-center">
                      {renameTarget?.id === ch.id ? (
                        <input autoFocus value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenameTarget(null); }}
                          onBlur={submitRename}
                          className="flex-1 px-2 py-1.5 rounded bg-surface-2 text-white text-sm border border-accent outline-none"
                        />
                      ) : (
                        <>
                          <button onClick={() => goChannel(ch)}
                            className={`flex-1 px-2 py-1.5 rounded text-left hover:bg-surface-5 transition text-sm truncate flex items-center ${
                              activeChannelId === ch.id ? "bg-surface-5 text-white" : getUnread(ch.id) > 0 ? "text-white font-semibold" : "text-gray-300"
                            }`}
                          >
                            {ch.type === "POST" ? (
                              <svg viewBox="0 0 16 16" className="w-4 h-4 inline-block mr-1.5 text-pink-400 -mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
                                <rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r="1"/><path d="M14 10l-3.5-3.5L4 13"/>
                              </svg>
                            ) : ch.botOnly ? (
                              <svg viewBox="0 0 16 16" className="w-4 h-4 inline-block mr-1.5 text-indigo-400 -mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
                                <rect x="2" y="4" width="12" height="9" rx="2"/><circle cx="5.5" cy="8.5" r="1.2"/><circle cx="10.5" cy="8.5" r="1.2"/><path d="M6 11h4"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 16 16" className="w-4 h-4 inline-block mr-1.5 text-gray-500 -mt-0.5 shrink-0" fill="none">
                                <path d="M3 2.5h10M3 2.5v2M13 2.5v2M8 2.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                              </svg>
                            )}
                            <span className="truncate">{ch.title}</span>
                            {(() => { const u = getUnread(ch.id); return u > 0 && activeChannelId !== ch.id ? (
                              <span className="ml-auto bg-emerald-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 shrink-0">
                                {u > 99 ? "99+" : u}
                              </span>
                            ) : null; })()}
                          </button>
                          <button onClick={(e) => openCtxMenu(e, ch)}
                            className="p-1 rounded hover:bg-surface-5 text-gray-500 hover:text-white opacity-0 group-hover/ch:opacity-100 transition shrink-0"
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Ses kanalları — aynı kategori içinde */}
                  {catVoiceChs.map((ch) => {
                    const members = mergedVoiceMembers[ch.id] || [];
                    return (
                      <div key={ch.id}>
                        <div className="group/ch flex items-center">
                          {renameTarget?.id === ch.id ? (
                            <input autoFocus value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenameTarget(null); }}
                              onBlur={submitRename}
                              className="flex-1 px-2 py-1.5 rounded bg-surface-2 text-white text-sm border border-accent outline-none"
                            />
                          ) : (
                            <>
                              <button onClick={() => goChannel(ch)}
                                className={`flex-1 px-2 py-1.5 rounded text-left hover:bg-surface-5 transition text-sm truncate ${
                                  activeChannelId === ch.id ? "bg-surface-5 text-white" : "text-gray-300"
                                }`}
                              >
                                <span className="text-gray-400 mr-1 inline-flex items-center">{ch.type === "VIDEO"
                                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                }</span> {ch.title}
                                {members.length > 0 && <span className="ml-1 text-[10px] text-emerald-400">({members.length})</span>}
                              </button>
                              <button onClick={(e) => openCtxMenu(e, ch)}
                                className="p-1 rounded hover:bg-surface-5 text-gray-500 hover:text-white opacity-0 group-hover/ch:opacity-100 transition shrink-0"
                              >
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                  <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        {members.length > 0 && (
                          <div className="ml-6 mt-0.5 mb-1 flex flex-col gap-0.5">
                            {members.map((m) => {
                              const pState = media.voiceParticipantStates[m.identity];
                              const isMicMuted = pState?.micMuted ?? false;
                              const isSpeaking = pState?.speaking ?? false;
                              const isLocal = user && m.identity === user.id;
                              const isDeafened = isLocal && media.deafened;
                              return (
                                <div key={m.identity}
                                  className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-surface-4 transition cursor-pointer"
                                  onClick={(e) => setVolumeMenu({
                                    identity: m.identity, name: m.name || m.identity, avatarUrl: m.avatarUrl,
                                    isLocal: !!isLocal, channelId: ch.id, x: e.clientX, y: e.clientY,
                                  })}
                                >
                                  <div className={`relative shrink-0`} style={{ borderRadius: "30%" }}>
                                    <div className={`${isSpeaking ? "ring-2 ring-emerald-500" : ""}`} style={{ borderRadius: "30%" }}>
                                      <Avatar src={m.avatarUrl} name={m.name} size={24} />
                                    </div>
                                    {isSpeaking && (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 grid place-items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      </div>
                                    )}
                                  </div>
                          <span className="text-xs text-gray-300 truncate flex-1">{m.name || m.identity}</span>
                          {/* Mic / Deafen ikonları */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isMicMuted && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" className="w-3.5 h-3.5">
                                <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" strokeWidth="2" />
                                <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                            {isDeafened && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" className="w-3.5 h-3.5">
                                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" strokeWidth="2" />
                                <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Konu kanalları */}
      {topicChannels.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1 px-2 py-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-gray-500">
              <path d="M5 1v14M11 1v14M1 5h14M1 11h14" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Konular</span>
          </div>
          {topicChannels.map((ch) => (
            <div key={ch.id} className="group/ch flex items-center">
              <button
                onClick={() => { setActiveChannelId(ch.id); nav(paths.chat, { replace: true }); }}
                className={`flex-1 px-2 py-1.5 rounded text-left hover:bg-surface-5 transition text-sm truncate ${
                  activeChannelId === ch.id ? "bg-surface-5 text-white" : "text-gray-300"
                }`}
              >
                <span className="text-gray-400 mr-1">#</span>{ch.title}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Kanal Oluşturma Popup — artı butonunun yanında açılır */}
      {showCreate && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowCreate(null)} />
          <div
            className="fixed z-[9999] w-56 p-3 rounded-lg bg-surface-2 border border-border-light shadow-xl shadow-black/40"
            style={{ top: showCreate.y, left: showCreate.x }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Kanal adı"
              className="w-full p-2 rounded bg-surface-3 text-white border border-border-light text-sm outline-none focus:border-accent mb-2"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") createChannel(); if (e.key === "Escape") setShowCreate(null); }}
            />
            <div className="relative mb-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full p-2 pl-8 rounded bg-surface-3 text-white border border-border-light text-sm outline-none focus:border-accent appearance-none"
              >
                <option value="TEXT">Yazı Kanalı</option>
                <option value="VOICE">Ses Kanalı</option>
                <option value="POST">Gönderi Kanalı</option>
                <option value="THREAD">Konu Kanalı</option>
              </select>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                {newType === "TEXT" && <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M3 2.5h10M3 2.5v2M13 2.5v2M8 2.5V14"/><path d="M5.5 14h5" strokeWidth="1.4"/></svg>}
                {newType === "VOICE" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
                {newType === "POST" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
                {newType === "THREAD" && <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4"><path d="M5 1v14M11 1v14M1 5h14M1 11h14"/></svg>}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
            {newType === "TEXT" && (
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={newBotOnly} onChange={(e) => setNewBotOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-indigo-500" />
                <span className="text-xs text-gray-400">Sadece bot kanalı</span>
              </label>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(null)} className="flex-1 px-3 py-1.5 rounded text-xs bg-surface-3 text-gray-300 hover:bg-surface-5">
                İptal
              </button>
              <button onClick={createChannel} disabled={creating || !newName.trim()} className="flex-1 px-3 py-1.5 rounded text-xs bg-accent text-white hover:bg-accent-dark disabled:opacity-60">
                {creating ? "..." : "Oluştur"}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
    {/* Katılımcı ses seviyesi menüsü */}
    {volumeMenu && (
      <ParticipantVolumeMenu
        identity={volumeMenu.identity}
        name={volumeMenu.name}
        avatarUrl={volumeMenu.avatarUrl}
        position={{ x: volumeMenu.x, y: volumeMenu.y }}
        isLocal={volumeMenu.isLocal}
        channelId={volumeMenu.channelId}
        onClose={() => setVolumeMenu(null)}
      />
    )}
    {/* Kanal context menü */}
    {ctxMenu && (
      <div
        ref={ctxRef}
        className="fixed z-[9999] bg-surface-2 border border-border-light rounded-lg shadow-xl shadow-black/40 py-1 min-w-[160px]"
        style={{ top: ctxMenu.y, left: ctxMenu.x }}
      >
        <button
          onClick={() => { setCtxMenu(null); nav(paths.serverSettings + "?tab=channels"); }}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-surface-5 flex items-center gap-2"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><circle cx="8" cy="8" r="2.5"/><path d="M13.5 10a1.1 1.1 0 0 0 .22 1.22l.04.04a1.33 1.33 0 1 1-1.89 1.89l-.04-.04A1.1 1.1 0 0 0 10 13.5v.17a1.33 1.33 0 0 1-2.67 0v-.06A1.1 1.1 0 0 0 6 12.7a1.1 1.1 0 0 0-1.22.22l-.04.04a1.33 1.33 0 1 1-1.89-1.89l.04-.04A1.1 1.1 0 0 0 3.3 10a1.1 1.1 0 0 0-1-.67H2a1.33 1.33 0 0 1 0-2.67h.06A1.1 1.1 0 0 0 3.3 6a1.1 1.1 0 0 0-.22-1.22l-.04-.04a1.33 1.33 0 1 1 1.89-1.89l.04.04A1.1 1.1 0 0 0 6 3.3V2a1.33 1.33 0 0 1 2.67 0v.06a1.1 1.1 0 0 0 .67 1 1.1 1.1 0 0 0 1.22-.22l.04-.04a1.33 1.33 0 1 1 1.89 1.89l-.04.04A1.1 1.1 0 0 0 12.7 6c.17.3.4.55.67.67h.3A1.33 1.33 0 0 1 14 8a1.33 1.33 0 0 1-1.33 1.33h-.06a1.1 1.1 0 0 0-1.1.67z" strokeLinecap="round"/></svg>
          Kanal Ayarları
        </button>
        <button
          onClick={() => { setCtxMenu(null); nav(paths.serverSettings + "?tab=channels"); }}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-surface-5 flex items-center gap-2"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><rect x="2" y="8" width="12" height="7" rx="1.5"/><path d="M5 8V5a3 3 0 0 1 6 0v3" strokeLinecap="round"/></svg>
          İzinler
        </button>
        <button
          onClick={() => startRename(ctxMenu.channel)}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-surface-5 flex items-center gap-2"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Yeniden Adlandır
        </button>
        <div className="h-px bg-border-light my-1" />
        {(ctxMenu.channel.type === "TEXT" || ctxMenu.channel.type === "GUILD") && (
          ctxMenu.channel.bgMusicUrl ? (
            <button
              onClick={() => { handleMusicDelete(ctxMenu.channel.id); setCtxMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-surface-5 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              Müziği Kaldır
            </button>
          ) : (
            <button
              onClick={() => { setMusicUploadTarget(ctxMenu.channel.id); setCtxMenu(null); setTimeout(() => musicInputRef.current?.click(), 50); }}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-surface-5 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              Müzik Yükle
            </button>
          )
        )}
        <div className="h-px bg-border-light my-1" />
        <button
          onClick={() => { setDeleteConfirm(ctxMenu.channel); setCtxMenu(null); }}
          className="w-full px-3 py-1.5 text-left text-sm text-rose-400 hover:bg-rose-500/15 flex items-center gap-2"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4m2 0v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4h9.34z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Kanalı Sil
        </button>
      </div>
    )}
    <ConfirmDialog
      open={!!switchConfirm}
      title="Sesli Kanal Değiştir"
      message="Zaten bir sesli kanala bağlısın. Mevcut kanaldan ayrılıp bu kanala geçmek istiyor musun?"
      confirmText="Geç"
      cancelText="İptal"
      onConfirm={() => {
        const chId = switchConfirm;
        setSwitchConfirm(null);
        doGoVoice(chId);
      }}
      onCancel={() => setSwitchConfirm(null)}
    />
    <ConfirmDialog
      open={!!deleteConfirm}
      title="Kanalı Sil"
      message={`"${deleteConfirm?.title}" kanalını silmek istediğinden emin misin? Bu işlem geri alınamaz.`}
      confirmText="Sil"
      cancelText="Vazgeç"
      onConfirm={handleDelete}
      onCancel={() => setDeleteConfirm(null)}
    />
    <input
      ref={musicInputRef}
      type="file"
      accept="audio/*"
      className="hidden"
      onChange={handleMusicUpload}
    />
    </div>
  );
}
