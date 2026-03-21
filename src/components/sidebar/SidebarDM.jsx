import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePresence } from "../../context/PresenceContext";
import dmApi from "../../services/dmApi";
import { subscribeTopic } from "../../services/ws";
import Avatar from "../common/Avatar";
import HoverProfileCard from "../common/HoverProfileCard";
import ConfirmDialog from "../modals/ConfirmDialog";
import { useUnread } from "../../context/UnreadContext";
import CreateGroupDMModal from "../modals/CreateGroupDMModal";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
  return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

const PLACEHOLDER_TITLES = new Set(["dm", "direct message", "direkt mesaj"]);

function pickOther(ch, me) {
  const meKeys = new Set(
    [me?.id, me?.userId, me?.username, me?.name]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase())
  );

  const users = ch.participants || ch.users || ch.members || [];
  const arr = Array.isArray(users) ? users : [];

  const other = arr.find((u) => {
    if (!u) return false;
    const keys = [u?.id, u?.userId, u?.username, u?.name, u?.displayName]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase());
    return !keys.some((k) => meKeys.has(k));
  });

  if (other) {
    return other.displayName || other.name || other.username || null;
  }
  return null;
}

export default function SidebarDM() {
  const [dms, setDms] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cl-hidden-dms") || "[]"); } catch { return []; }
  });
  const [menuTarget, setMenuTarget] = useState(null); // { id, name, isActive, x, y }
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, name, isActive }
  const [showCreateDM, setShowCreateDM] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const { getStatus, fetchPresences } = usePresence();
  const { getUnread } = useUnread();

  const activeChannelId = useMemo(() => {
    const m = loc.pathname.match(/\/app\/dm\/([^/]+)/);
    return m?.[1] || null;
  }, [loc.pathname]);

  const loadDms = useCallback(async () => {
    try {
      const list = await dmApi.listDMs();
      setDms(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("DM list error:", e);
      setDms([]);
    }
  }, []);

  useEffect(() => {
    loadDms();
  }, [loc.pathname, loadDms]);

  // DM kanallarındaki yeni mesajları dinle → listeyi güncelle (debounce ile)
  const dmIdsRef = useRef([]);
  useEffect(() => {
    if (!Array.isArray(dms)) return;
    const ids = dms.map((ch) => ch.id);
    // Sadece kanal listesi değiştiyse yeniden subscribe et
    if (JSON.stringify(ids) === JSON.stringify(dmIdsRef.current)) return;
    dmIdsRef.current = ids;
  }, [dms]);

  useEffect(() => {
    if (!Array.isArray(dms) || dms.length === 0) return;
    let timer = null;
    const debouncedLoad = () => {
      clearTimeout(timer);
      timer = setTimeout(loadDms, 800);
    };
    const unsubs = dms.map((ch) =>
      subscribeTopic(`/topic/channels/${ch.id}`, debouncedLoad)
    );
    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u?.());
    };
  }, [dms?.length, loadDms]);

  const items = useMemo(() => {
    if (!Array.isArray(dms) || !user) return [];
    return dms.map((ch) => {
      const otherName = pickOther(ch, user);
      const generic = !ch.title || PLACEHOLDER_TITLES.has(String(ch.title).trim().toLowerCase());
      const name = otherName || (generic ? "?" : ch.title);

      const last = ch.lastMessage;
      let preview = "";
      if (last?.content) {
        const sender = last.senderName || "";
        const msg = last.content.length > 40 ? last.content.slice(0, 40) + "…" : last.content;
        preview = sender ? `${sender}: ${msg}` : msg;
      }

      // Karşı kullanıcının avatarUrl'ini bul
      const meKeys = new Set(
        [user?.id, user?.username].filter(Boolean).map(x => String(x).toLowerCase())
      );
      const other = (ch.participants || []).find(p => {
        const keys = [p?.id, p?.username].filter(Boolean).map(x => String(x).toLowerCase());
        return !keys.some(k => meKeys.has(k));
      });

      // Grup DM için isim: title varsa onu kullan, yoksa üyelerin isimlerini birleştir
      let groupName = name;
      if (ch.isGroup) {
        if (ch.title && !PLACEHOLDER_TITLES.has(String(ch.title).trim().toLowerCase())) {
          groupName = ch.title;
        } else {
          // Üyelerin isimlerini birleştir (kendimiz hariç)
          const others = (ch.participants || []).filter(p => {
            const keys = [p?.id, p?.username].filter(Boolean).map(x => String(x).toLowerCase());
            return !keys.some(k => meKeys.has(k));
          });
          groupName = others.map(p => p.displayName || p.username).slice(0, 3).join(", ");
          if (others.length > 3) groupName += ` +${others.length - 3}`;
          if (!groupName) groupName = "Grup Sohbeti";
        }
      }

      return {
        id: ch.id,
        name: ch.isGroup ? groupName : name,
        avatarUrl: ch.isGroup ? ch.iconUrl : (other?.avatarUrl || null),
        otherId: other?.id || null,
        otherUser: ch.isGroup ? null : (other || null),
        preview,
        time: last?.createdAt || ch.updatedAt,
        isGroup: ch.isGroup,
        memberCount: ch.memberCount,
      };
    });
  }, [dms, user]);

  // Gizlenen DM'leri filtrele
  const visibleItems = useMemo(() => items.filter(i => !hiddenIds.includes(i.id)), [items, hiddenIds]);

  const hideDm = (id) => {
    const next = [...hiddenIds, id];
    setHiddenIds(next);
    localStorage.setItem("cl-hidden-dms", JSON.stringify(next));
  };

  const unhideDm = (id) => {
    const next = hiddenIds.filter(x => x !== id);
    setHiddenIds(next);
    localStorage.setItem("cl-hidden-dms", JSON.stringify(next));
  };

  // Arkadaştan DM açılınca gizliyse göster
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.channelId;
      if (id && hiddenIds.includes(id)) unhideDm(id);
    };
    window.addEventListener("open-dm-chat", handler);
    return () => window.removeEventListener("open-dm-chat", handler);
  }, [hiddenIds]);

  // DM listesi yüklendiğinde karşı tarafların presence durumunu çek
  useEffect(() => {
    const ids = items.map((i) => i.otherId).filter(Boolean);
    if (ids.length > 0) fetchPresences(ids);
  }, [items.length]);

  return (
    <div className="h-full w-full bg-surface-1 text-gray-200 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <span className="text-[11px] tracking-wide text-gray-400 uppercase">
          Direkt Mesajlar
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">{visibleItems.length}</span>
          <button
            onClick={() => setShowCreateDM(true)}
            className="w-5 h-5 rounded grid place-items-center text-gray-500 hover:text-white hover:bg-surface-5 transition"
            title="Yeni mesaj / Grup DM oluştur"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {dms === null && (
          <div className="px-3 py-2 text-sm text-gray-400">Yükleniyor…</div>
        )}
        {Array.isArray(dms) && dms.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            Henüz DM yok
          </div>
        )}

        {visibleItems.map((item) => {
          const isActive = activeChannelId === item.id;
          return (
            <div key={item.id} className="group relative mb-0.5">
              <button
                onClick={() => nav(`/app/dm/${item.id}`)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-3
                  ${isActive
                    ? "bg-surface-1 border border-border"
                    : "hover:bg-surface-1 border border-transparent"
                  }`}
              >
                {/* Avatar + isim: sadece bu alan HoverProfileCard tetikler */}
                <HoverProfileCard user={item.otherUser} placement="right">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.isGroup ? (
                      item.avatarUrl ? (
                        <img src={item.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-5 grid place-items-center shrink-0">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a4 4 0 00-2-3.46A5.98 5.98 0 0118 17v1h-2zM4.46 13.54A5.98 5.98 0 002 17v1H0v-1a4 4 0 012.46-3.46z"/>
                          </svg>
                        </div>
                      )
                    ) : (
                      <Avatar src={item.avatarUrl} name={item.name} size={40} status={item.otherId ? getStatus(item.otherId) : undefined} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate ${isActive ? "text-white" : getUnread(item.id) > 0 ? "text-white font-semibold" : "text-gray-200"}`}>
                          {item.name}
                          {item.isGroup && (
                            <span className="text-[10px] text-gray-500 ml-1">
                              ({item.memberCount})
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.time && (
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {timeAgo(item.time)}
                            </span>
                          )}
                          {(() => { const u = getUnread(item.id); return u > 0 ? (
                            <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                              {u > 99 ? "99+" : u}
                            </span>
                          ) : null; })()}
                        </div>
                      </div>
                      {item.preview && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {item.preview}
                        </div>
                      )}
                    </div>
                  </div>
                </HoverProfileCard>
              </button>
              {/* 3 nokta menü — HoverProfileCard dışında */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuTarget({ id: item.id, name: item.name, isActive, x: rect.right, y: rect.top });
                }}
                className="absolute top-1.5 right-1.5 hidden group-hover:grid w-5 h-5 place-items-center rounded bg-surface-5 hover:bg-surface-6 text-gray-500 hover:text-gray-300 transition z-10"
                title="Seçenekler"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <circle cx="8" cy="3" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="8" cy="13" r="1.3"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3 nokta context menü */}
      {menuTarget && (
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setMenuTarget(null)} />
          <div
            style={{ position: "fixed", top: menuTarget.y, left: menuTarget.x + 4, zIndex: 99999 }}
            className="w-48 bg-surface-3 border border-border-light rounded-xl shadow-2xl shadow-black/40 py-1"
          >
            <button
              onClick={() => { hideDm(menuTarget.id); if (menuTarget.isActive) nav("/app/friends", { replace: true }); setMenuTarget(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-surface-5 rounded-lg mx-0 transition"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-500">
                <path d="M1 1l14 14M9.95 4.05A5 5 0 0114 8c0 .74-.16 1.44-.46 2.07M4.05 4.05A5 5 0 002 8c0 1.05.32 2.02.87 2.83L2 12" strokeLinecap="round"/>
                <circle cx="8" cy="8" r="1.5"/>
              </svg>
              Sohbeti gizle
            </button>
            <button
              onClick={() => { setConfirmAction({ type: "delete", id: menuTarget.id, name: menuTarget.name, isActive: menuTarget.isActive }); setMenuTarget(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg mx-0 transition"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sohbeti sil
            </button>
          </div>
        </>
      )}

      {/* Grup DM oluştur modalı */}
      <CreateGroupDMModal open={showCreateDM} onClose={() => { setShowCreateDM(false); loadDms(); }} />

      {/* Silme onay dialogu */}
      <ConfirmDialog
        open={confirmAction?.type === "delete"}
        title="Sohbeti Sil"
        message={`"${confirmAction?.name}" ile olan tüm mesajlar kalıcı olarak silinecek. Bu işlem geri alınamaz!`}
        confirmText="Sil"
        cancelText="Vazgeç"
        onConfirm={async () => {
          if (!confirmAction) return;
          try {
            await dmApi.leaveDm(confirmAction.id);
            setDms(prev => (prev || []).filter(d => d.id !== confirmAction.id));
            if (confirmAction.isActive) nav("/app/friends", { replace: true });
          } catch (err) { console.error("DM delete error:", err); }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
