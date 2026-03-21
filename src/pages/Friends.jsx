import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { friendsApi } from "../services/friendsApi";
import dmApi from "../services/dmApi";
import { usePresence } from "../context/PresenceContext";
import { subscribeTopic } from "../services/ws";
import Avatar from "../components/common/Avatar";
import HoverProfileCard from "../components/common/HoverProfileCard";
import toast from "react-hot-toast";

const TABS = [
  { key: "friends", label: "Arkadaşlar" },
  { key: "pending", label: "Bekleyen" },
  { key: "outgoing", label: "Gönderilen" },
  { key: "blocked", label: "Engellenenler" },
];

export default function Friends({ onNavigateSide }) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState("friends");
  const [openAdd, setOpenAdd] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null); // relationId
  const nav = useNavigate();
  const { getStatus, fetchPresences } = usePresence();

  const loadFriends = useCallback(async () => {
    try {
      const list = await friendsApi.list();
      setFriends(Array.isArray(list) ? list : []);
      const ids = (list || []).map((f) => f.peer?.id).filter(Boolean);
      if (ids.length > 0) fetchPresences(ids);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPresences]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  useEffect(() => {
    const unsub = subscribeTopic("/user/queue/friend-events", () => {
      loadFriends();
      if (activeTab === "pending") loadIncoming();
      if (activeTab === "outgoing") loadOutgoing();
    });
    return () => unsub?.();
  }, [loadFriends, activeTab]);

  const loadIncoming = async () => {
    try { setIncoming(await friendsApi.getIncoming()); } catch { setIncoming([]); }
  };
  const loadOutgoing = async () => {
    try { setOutgoing(await friendsApi.getOutgoing()); } catch { setOutgoing([]); }
  };
  const loadBlocked = async () => {
    try { setBlocked(await friendsApi.listBlocked()); } catch { setBlocked([]); }
  };

  useEffect(() => {
    if (activeTab === "pending") loadIncoming();
    if (activeTab === "outgoing") loadOutgoing();
    if (activeTab === "blocked") loadBlocked();
  }, [activeTab]);

  const startDm = async (peerId) => {
    try {
      const ch = await dmApi.ensureWithParticipants([peerId]);
      window.dispatchEvent(new CustomEvent("open-dm-chat", { detail: { channelId: ch.id } }));
    } catch { toast.error("DM oluşturulamadı."); }
  };

  const submitAdd = async () => {
    if (!addUsername.trim()) return;
    try {
      const found = await friendsApi.lookupExact(addUsername.trim());
      if (!found?.id) { toast.error("Kullanıcı bulunamadı."); return; }
      await friendsApi.sendRequest(found.id);
      toast.success("İstek gönderildi.");
      setOpenAdd(false);
      setAddUsername("");
    } catch { toast.error("İstek gönderilemedi."); }
  };

  const handleUnfriend = async (relationId) => {
    try {
      await friendsApi.remove(relationId);
      toast.success("Arkadaşlıktan çıkarıldı.");
      loadFriends();
    } catch { toast.error("İşlem başarısız."); }
    setMenuOpen(null);
  };

  const sorted = [...friends].sort((a, b) => {
    const order = { online: 0, idle: 1, dnd: 2, offline: 3 };
    return (order[getStatus(a.peer?.id)] ?? 3) - (order[getStatus(b.peer?.id)] ?? 3);
  });

  const filtered = searchQuery.trim()
    ? sorted.filter((f) => {
        const q = searchQuery.toLowerCase();
        return (f.peer?.displayName || "").toLowerCase().includes(q) || (f.peer?.username || "").toLowerCase().includes(q);
      })
    : sorted;

  const onlineCount = friends.filter((f) => getStatus(f.peer?.id) !== "offline").length;

  return (
    <div className="h-full overflow-hidden bg-surface-1 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="min-h-[3rem] flex items-center gap-1.5 px-2 md:px-3 border-b border-border overflow-hidden">
        <button onClick={onNavigateSide} className="md:hidden px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-xs shrink-0">
          Listeler
        </button>
        {/* Tabs */}
        <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap shrink-0 ${
                activeTab === t.key ? "bg-surface-5 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-surface-3"
              }`}
            >
              {t.label}
              {t.key === "pending" && incoming.length > 0 && (
                <span className="ml-1 bg-rose-500 text-white text-[9px] px-1 rounded-full">{incoming.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0" />
        <div className="relative shrink-0">
          <button onClick={() => setOpenAdd((v) => !v)} className="p-1.5 rounded-md bg-accent-dark hover:bg-accent transition" title="Arkadaş Ekle">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </svg>
          </button>
          {openAdd && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenAdd(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-surface-3 border border-border rounded-xl shadow-xl p-3">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">Arkadaş Ekle</div>
                <div className="flex gap-1.5">
                  <input value={addUsername} onChange={(e) => setAddUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitAdd()} placeholder="@kullanıcıadı" autoFocus
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-1 border border-border outline-none focus:border-accent text-sm" />
                  <button onClick={submitAdd} className="px-2.5 py-1.5 rounded-lg bg-accent-dark hover:bg-accent text-xs shrink-0">Gönder</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 flex-1 overflow-y-auto min-w-0">

        {/* ARKADAŞLAR TAB */}
        {activeTab === "friends" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs text-gray-400">Arkadaşlar — {onlineCount} çevrimiçi</div>
              <div className="ml-auto">
                <input
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ara..." className="bg-surface-2 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none border border-border focus:border-accent w-40"
                />
              </div>
            </div>
            {loading && <div className="text-sm text-gray-400">Yükleniyor…</div>}
            {!loading && friends.length === 0 && <div className="text-sm text-gray-500">Henüz arkadaş yok.</div>}
            <div className="flex flex-col gap-1">
              {filtered.map((f) => {
                const p = f.peer || {};
                const name = p.displayName || p.username || "Kullanıcı";
                const tag = p.username ? `@${p.username}` : "";
                const status = getStatus(p.id);
                return (
                  <HoverProfileCard key={f.relationId || p.id} user={p} placement="right">
                    <div className="relative text-left bg-surface-1 hover:bg-surface-3 transition rounded-lg px-3 py-2.5 min-w-0 flex items-center gap-3 group">
                      <button onClick={() => startDm(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <Avatar src={p.avatarUrl} name={name} size={36} status={status} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-sm">{name}</div>
                          <div className="text-xs text-gray-400 truncate">{tag}</div>
                        </div>
                      </button>
                      {/* 3 nokta menü */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === f.relationId ? null : f.relationId); }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-5 text-gray-500 hover:text-white transition"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
                        </button>
                        {menuOpen === f.relationId && (
                          <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-light rounded-lg shadow-xl shadow-black/40 py-1 min-w-[150px]">
                            <button onClick={() => { startDm(p.id); setMenuOpen(null); }}
                              className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5">Mesaj Gönder</button>
                            <button onClick={() => handleUnfriend(f.relationId)}
                              className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-surface-5">Arkadaşı Kaldır</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </HoverProfileCard>
                );
              })}
            </div>
          </>
        )}

        {/* BEKLEYEN TAB */}
        {activeTab === "pending" && (
          <>
            <div className="text-xs text-gray-400 mb-3">Gelen İstekler — {incoming.length}</div>
            {incoming.length === 0 && <div className="text-sm text-gray-500">Bekleyen istek yok.</div>}
            <div className="flex flex-col gap-1">
              {incoming.map((req) => {
                const p = req.sender || req.requester || {};
                const name = p.displayName || p.username || "Kullanıcı";
                return (
                  <div key={req.id || req.relationId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-1 hover:bg-surface-3 transition">
                    <Avatar src={p.avatarUrl} name={name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{name}</div>
                      <div className="text-xs text-gray-400">@{p.username}</div>
                    </div>
                    <button onClick={async () => { try { await friendsApi.accept(req.id || req.relationId); toast.success("Kabul edildi!"); loadIncoming(); loadFriends(); } catch { toast.error("Hata"); } }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs">Kabul</button>
                    <button onClick={async () => { try { await friendsApi.reject(req.id || req.relationId); toast("Reddedildi"); loadIncoming(); } catch { toast.error("Hata"); } }}
                      className="px-3 py-1 rounded-lg bg-surface-5 hover:bg-surface-6 text-gray-300 text-xs">Reddet</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* GÖNDERİLEN TAB */}
        {activeTab === "outgoing" && (
          <>
            <div className="text-xs text-gray-400 mb-3">Gönderilen İstekler — {outgoing.length}</div>
            {outgoing.length === 0 && <div className="text-sm text-gray-500">Gönderilen istek yok.</div>}
            <div className="flex flex-col gap-1">
              {outgoing.map((req) => {
                const p = req.receiver || {};
                const name = p.displayName || p.username || "Kullanıcı";
                return (
                  <div key={req.id || req.relationId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-1 hover:bg-surface-3 transition">
                    <Avatar src={p.avatarUrl} name={name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{name}</div>
                      <div className="text-xs text-gray-400">@{p.username}</div>
                    </div>
                    <span className="text-xs text-gray-500">Bekliyor</span>
                    <button onClick={async () => { try { await friendsApi.reject(req.id || req.relationId); toast("İptal edildi"); loadOutgoing(); } catch { toast.error("Hata"); } }}
                      className="px-3 py-1 rounded-lg bg-surface-5 hover:bg-surface-6 text-gray-300 text-xs">İptal</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ENGELLENENLER TAB */}
        {activeTab === "blocked" && (
          <>
            <div className="text-xs text-gray-400 mb-3">Engellenen Kullanıcılar — {blocked.length}</div>
            {blocked.length === 0 && <div className="text-sm text-gray-500">Engellenen kullanıcı yok.</div>}
            <div className="flex flex-col gap-1">
              {blocked.map((b) => {
                const p = b.peer || {};
                const name = p.displayName || p.username || "Kullanıcı";
                return (
                  <div key={b.relationId || p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-1 hover:bg-surface-3 transition">
                    <Avatar src={p.avatarUrl} name={name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{name}</div>
                      <div className="text-xs text-gray-400">@{p.username}</div>
                    </div>
                    <button onClick={async () => { try { await friendsApi.unblock(p.id); toast.success("Engel kaldırıldı"); loadBlocked(); } catch { toast.error("Hata"); } }}
                      className="px-3 py-1 rounded-lg bg-surface-5 hover:bg-surface-6 text-gray-300 text-xs">Engeli Kaldır</button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
