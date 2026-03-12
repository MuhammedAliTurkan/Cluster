import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useMedia } from "../../context/MediaContext";
import { useAuth } from "../../context/AuthContext";
import { serverApi } from "../../services/serverApi";
import { fetchVoiceParticipants } from "../../services/livekitApi";
import { paths } from "../../routes/paths";
import UserTray from "../users/UserTray";
import Avatar from "../common/Avatar";
import ParticipantVolumeMenu from "../voice/ParticipantVolumeMenu";

export default function SidebarChannels({ collapsed }) {
  const { activeServerId, activeChannelId, setActiveChannelId, lastVisitedByServer, setLastVisitedByServer } = useChat();
  const media = useMedia();
  const { user } = useAuth();
  const nav = useNavigate();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("TEXT");
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const inviteRef = useRef(null);
  const [volumeMenu, setVolumeMenu] = useState(null); // { identity, name, avatarUrl, isLocal, x, y }
  const [serverName, setServerName] = useState("");

  // Ses kanalı katılımcıları: { channelId: [{identity, name, avatarUrl}] }
  const [voiceMembers, setVoiceMembers] = useState({});

  const createInvite = async () => {
    if (!activeServerId) return;
    setInviteLoading(true);
    try {
      const data = await serverApi.createInvite(activeServerId);
      setInviteCode(data.code);
      setTimeout(() => inviteRef.current?.select(), 50);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    inviteRef.current?.select();
  };

  const fetchChannels = async () => {
    if (!activeServerId) return;
    setLoading(true);
    try {
      const data = await serverApi.channels(activeServerId);
      setChannels(data);

      // Son ziyaret edilen kanalı geri yükle
      const lastChId = lastVisitedByServer[activeServerId];
      const lastCh = lastChId && data.find((ch) => ch.id === lastChId);

      if (lastCh) {
        setActiveChannelId(lastCh.id);
        nav(paths.chat, { replace: true });
      } else if (data.length > 0) {
        // İlk text kanalını varsayılan olarak seç
        const firstText = data.find((ch) => ch.type === "TEXT" || ch.type === "GUILD");
        if (firstText) setActiveChannelId(firstText.id);
      }
    } catch (e) {
      console.error("Kanallar yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setChannels([]);
    setVoiceMembers({});
    setServerName("");
    fetchChannels();
    if (activeServerId) {
      serverApi.get(activeServerId).then((s) => setServerName(s?.name || "")).catch(() => {});
    }
  }, [activeServerId]);

  // Ses kanalı katılımcılarını periyodik olarak çek
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

  useEffect(() => {
    if (channels.length === 0) return;
    fetchAllVoiceParticipants();
    const interval = setInterval(fetchAllVoiceParticipants, 5000);
    return () => clearInterval(interval);
  }, [fetchAllVoiceParticipants]);

  // Local kullanıcıyı her zaman göster (API'ye bağlı olmadan)
  const mergedVoiceMembers = useMemo(() => {
    const merged = { ...voiceMembers };

    // Eğer bu sunucudaki bir ses kanalındaysa, local kullanıcıyı ekle
    if (media.inCall && media.channelId && user) {
      const localEntry = {
        identity: user.id,
        name: user.displayName || user.username || "?",
        avatarUrl: user.avatarUrl || null,
      };
      const existing = merged[media.channelId] || [];
      // Zaten listede yoksa ekle
      if (!existing.some((m) => m.identity === user.id)) {
        merged[media.channelId] = [...existing, localEntry];
      }
    }

    return merged;
  }, [voiceMembers, media.inCall, media.channelId, user]);

  if (collapsed) {
    return <div className="w-full bg-[#2b2d31] hidden md:block" />;
  }

  const textChannels = channels.filter((ch) => ch.type === "TEXT" || ch.type === "GUILD");
  const voiceChannels = channels.filter((ch) => ch.type === "VOICE" || ch.type === "VIDEO");

  const goChannel = (ch) => {
    setActiveChannelId(ch.id);
    // Son ziyaret edilen text kanalını kaydet (ses kanalı ayrı tutulur)
    if (ch.type !== "VOICE" && ch.type !== "VIDEO") {
      setLastVisitedByServer((prev) => ({ ...prev, [activeServerId]: ch.id }));
    }
    if (ch.type === "VOICE" || ch.type === "VIDEO") {
      nav(paths.voice(ch.id) + `?channelId=${ch.id}&mode=audio`, { replace: true });
    } else {
      nav(paths.chat);
    }
  };

  const createChannel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await serverApi.createChannel(activeServerId, { title: newName.trim(), type: newType });
      setNewName("");
      setShowCreate(false);
      fetchChannels();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#2b2d31] flex flex-col">
    {/* Sunucu başlık barı */}
    <div className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-[#232428]">
      <span className="text-white font-semibold text-sm truncate">{serverName || "..."}</span>
      <div className="flex items-center gap-1 shrink-0">
        {/* Davet oluştur */}
        {inviteCode ? (
          <div className="flex gap-1 items-center">
            <input
              ref={inviteRef}
              value={inviteCode}
              readOnly
              className="w-20 px-1.5 py-1 rounded bg-[#1e1f22] text-white text-[10px] border border-[#3a3d43] outline-none font-mono"
              onClick={(e) => e.target.select()}
            />
            <button onClick={copyInvite} className="p-1.5 rounded hover:bg-[#3a3d43] text-gray-300 transition" title="Kopyala">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button onClick={() => setInviteCode("")} className="p-1.5 rounded hover:bg-[#3a3d43] text-gray-300 transition" title="Kapat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={createInvite}
            disabled={inviteLoading}
            className="p-1.5 rounded hover:bg-[#3a3d43] text-gray-400 hover:text-white transition disabled:opacity-60"
            title="Davet kodu olustur"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
            </svg>
          </button>
        )}
        {/* Ayarlar */}
        <button
          onClick={() => nav(paths.serverSettings)}
          className="p-1.5 rounded hover:bg-[#3a3d43] text-gray-400 hover:text-white transition"
          title="Sunucu ayarlari"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>

    <div className="flex-1 p-3 overflow-y-auto">

      {/* Yazı Kanalları */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-[11px] uppercase">Yazı Kanalları</span>
        <button
          onClick={() => { setShowCreate(true); setNewType("TEXT"); }}
          className="text-gray-400 hover:text-white text-lg leading-none"
          title="Kanal ekle"
        ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg></button>
      </div>
      {loading ? (
        <div className="text-gray-400 text-xs px-2">Yükleniyor...</div>
      ) : textChannels.length === 0 ? (
        <div className="text-gray-500 text-xs px-2">Kanal yok</div>
      ) : (
        <div className="flex flex-col gap-0.5 mb-4">
          {textChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => goChannel(ch)}
              className={`px-2 py-1.5 rounded text-left hover:bg-[#3a3d43] transition text-sm ${
                activeChannelId === ch.id ? "bg-[#3a3d43] text-white" : "text-gray-300"
              }`}
            >
              <span className="text-gray-400 mr-1">#</span> {ch.title}
            </button>
          ))}
        </div>
      )}

      {/* Ses Kanalları */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-[11px] uppercase">Ses Kanalları</span>
        <button
          onClick={() => { setShowCreate(true); setNewType("VOICE"); }}
          className="text-gray-400 hover:text-white text-lg leading-none"
          title="Ses kanalı ekle"
        ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg></button>
      </div>
      {voiceChannels.length === 0 ? (
        <div className="text-gray-500 text-xs px-2">Ses kanalı yok</div>
      ) : (
        <div className="flex flex-col gap-0.5 mb-4">
          {voiceChannels.map((ch) => {
            const members = mergedVoiceMembers[ch.id] || [];
            return (
              <div key={ch.id}>
                <button
                  onClick={() => goChannel(ch)}
                  className={`w-full px-2 py-1.5 rounded text-left hover:bg-[#3a3d43] transition text-sm ${
                    activeChannelId === ch.id ? "bg-[#3a3d43] text-white" : "text-gray-300"
                  }`}
                >
                  <span className="text-gray-400 mr-1 inline-flex items-center">{ch.type === "VIDEO"
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                  }</span> {ch.title}
                  {members.length > 0 && (
                    <span className="ml-1 text-[10px] text-emerald-400">({members.length})</span>
                  )}
                </button>
                {/* Katılımcı avatarları — Discord tarzı */}
                {members.length > 0 && (
                  <div className="ml-6 mt-0.5 mb-1 flex flex-col gap-0.5">
                    {members.map((m) => {
                      const pState = media.voiceParticipantStates[m.identity];
                      const isMicMuted = pState?.micMuted ?? false;
                      const isLocal = user && m.identity === user.id;
                      const isDeafened = isLocal && media.deafened;
                      return (
                        <div
                          key={m.identity}
                          className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[#35373c] transition cursor-pointer"
                          onClick={(e) => setVolumeMenu({
                            identity: m.identity,
                            name: m.name || m.identity,
                            avatarUrl: m.avatarUrl,
                            isLocal: !!isLocal,
                            x: e.clientX,
                            y: e.clientY,
                          })}
                        >
                          <Avatar src={m.avatarUrl} name={m.name} size={24} />
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

      {/* Kanal Oluşturma Formu */}
      {showCreate && (
        <div className="mt-2 p-3 rounded-lg bg-[#1e1f22] border border-[#3a3d43]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Kanal adı"
            className="w-full p-2 rounded bg-[#2b2d31] text-white border border-[#3a3d43] text-sm outline-none focus:border-orange-500 mb-2"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && createChannel()}
          />
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setNewType("TEXT")}
              className={`px-2 py-1 rounded text-xs ${newType === "TEXT" ? "bg-orange-500 text-white" : "bg-[#2b2d31] text-gray-300"}`}
            ><span className="inline-flex items-center gap-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M4 9h3l3-3v12l-3-3H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" /></svg> Yazı</span></button>
            <button
              onClick={() => setNewType("VOICE")}
              className={`px-2 py-1 rounded text-xs ${newType === "VOICE" ? "bg-orange-500 text-white" : "bg-[#2b2d31] text-gray-300"}`}
            ><span className="inline-flex items-center gap-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> Ses</span></button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1 rounded text-xs bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]">
              İptal
            </button>
            <button onClick={createChannel} disabled={creating || !newName.trim()} className="px-3 py-1 rounded text-xs bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60">
              {creating ? "..." : "Oluştur"}
            </button>
          </div>
        </div>
      )}
    </div>
    <UserTray />

    {/* Katılımcı ses seviyesi menüsü */}
    {volumeMenu && (
      <ParticipantVolumeMenu
        identity={volumeMenu.identity}
        name={volumeMenu.name}
        avatarUrl={volumeMenu.avatarUrl}
        position={{ x: volumeMenu.x, y: volumeMenu.y }}
        isLocal={volumeMenu.isLocal}
        onClose={() => setVolumeMenu(null)}
      />
    )}
    </div>
  );
}
