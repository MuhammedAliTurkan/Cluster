import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useChat } from "../../context/ChatContext";
import { useModals } from "../../context/ModalContext";
import { paths } from "../../routes/paths";
import { serverApi } from "../../services/serverApi";
import { subscribeTopic } from "../../services/ws";
import { useUnread } from "../../context/UnreadContext";

export default function SidebarServers() {
  const { activeServerId, setActiveServerId } = useChat();
  const { openServerHub } = useModals();
  const { getServerUnread } = useUnread();
  const loc = useLocation();
  const isPostsActive = loc.pathname.startsWith("/app/posts");
  const isBotsActive = loc.pathname.startsWith("/app/bots") || loc.pathname.startsWith("/app/bot/");
  const isDiscoverActive = loc.pathname.startsWith("/app/discover");
  const nav = useNavigate();

  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sunucu klasörleri — localStorage'da: { folderId: { name, serverIds[] } }
  const [folders, setFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cl-serverFolders") || "{}"); } catch { return {}; }
  });
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderMenu, setFolderMenu] = useState(null); // { serverId, x, y }

  const saveFolders = (f) => { setFolders(f); localStorage.setItem("cl-serverFolders", JSON.stringify(f)); };

  const createFolder = (name, serverIds) => {
    const id = "f_" + Date.now();
    saveFolders({ ...folders, [id]: { name, serverIds } });
  };

  const addToFolder = (folderId, serverId) => {
    const f = { ...folders };
    // Önce diğer klasörlerden çıkar
    Object.keys(f).forEach((k) => { f[k] = { ...f[k], serverIds: f[k].serverIds.filter((s) => s !== serverId) }; });
    if (f[folderId]) f[folderId] = { ...f[folderId], serverIds: [...f[folderId].serverIds, serverId] };
    saveFolders(f);
  };

  const removeFromFolder = (serverId) => {
    const f = { ...folders };
    Object.keys(f).forEach((k) => { f[k] = { ...f[k], serverIds: f[k].serverIds.filter((s) => s !== serverId) }; });
    saveFolders(f);
  };

  const deleteFolder = (folderId) => {
    const f = { ...folders };
    delete f[folderId];
    saveFolders(f);
  };

  // Klasördeki sunucular ve klasörsüz sunucular
  const folderedServerIds = new Set(Object.values(folders).flatMap((f) => f.serverIds));
  const standaloneServers = servers.filter((s) => !folderedServerIds.has(s.id));

  const fetchServers = async () => {
    try {
      const data = await serverApi.myServers();
      setServers(data);
    } catch (e) {
      console.error("Sunucular yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const handler = () => fetchServers();
    window.addEventListener("servers-updated", handler);
    return () => window.removeEventListener("servers-updated", handler);
  }, []);

  // Kick / sunucu silme bildirimi — kullanıcıya özel
  useEffect(() => {
    const unsub = subscribeTopic("/user/queue/server-events", (msg) => {
      if (msg?.event === "KICKED" || msg?.event === "SERVER_DELETED") {
        // Eğer aktif sunucu ise ana sayfaya yönlendir
        if (msg.serverId === activeServerId) {
          setActiveServerId(null);
          nav(paths.friends);
        }
        fetchServers();
      }
    });
    return () => unsub?.();
  }, [activeServerId]);

  const goServer = (id) => {
    setActiveServerId(id);
    localStorage.setItem("cl-lastServerId", id);
    nav(paths.chat);
  };

  return (
    <div className="w-[68px] bg-surface-0 flex flex-col items-center py-3 gap-2 border-r border-border">
      {/* Home/DM */}
      <Link
        to={paths.friends}
        className={`group relative h-12 w-12 grid place-items-center transition-all duration-200 ${
          activeServerId === null
            ? "bg-accent rounded-[16px]"
            : "bg-surface-4 rounded-[22px] hover:rounded-[16px] hover:bg-accent"
        }`}
        title="Ana Sayfa"
        onClick={() => setActiveServerId(null)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 transition-colors ${activeServerId === null ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {/* Active indicator pill */}
        {activeServerId === null && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] w-1 h-8 bg-white rounded-r-full" />
        )}
      </Link>

      {/* Gönderiler */}
      <Link
        to="/app/posts"
        className={`group relative h-12 w-12 grid place-items-center transition-all duration-200 ${
          isPostsActive ? "bg-pink-600 rounded-[16px]" : "bg-surface-4 rounded-[22px] hover:rounded-[16px] hover:bg-pink-600"
        }`}
        title="Gönderiler"
        onClick={() => setActiveServerId(null)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 transition-colors ${isPostsActive ? "text-white" : "text-pink-400 group-hover:text-white"}`}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        {isPostsActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] w-1 h-8 bg-white rounded-r-full" />}
      </Link>

      <div className="w-8 h-px bg-border-light my-1" />

      {/* Sunucular */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 w-full px-2 scrollbar-none">
        {loading ? (
          <div className="text-[10px] text-gray-500 mt-2">...</div>
        ) : (
          <>
            {/* Klasörler */}
            {Object.entries(folders).map(([fId, folder]) => {
              const folderServers = folder.serverIds.map((id) => servers.find((s) => s.id === id)).filter(Boolean);
              if (!folderServers.length) return null;
              const isExpanded = expandedFolders[fId];
              const totalUnread = folderServers.reduce((sum, s) => sum + (getServerUnread(s.id) || 0), 0);
              return (
                <div key={fId} className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setExpandedFolders((p) => ({ ...p, [fId]: !p[fId] }))}
                    onContextMenu={(e) => { e.preventDefault(); if (confirm(`"${folder.name}" klasörünü sil?`)) deleteFolder(fId); }}
                    className="relative h-12 w-12 rounded-[22px] hover:rounded-[16px] bg-surface-3 hover:bg-surface-5 grid grid-cols-2 gap-0.5 p-1.5 transition-all duration-200"
                    title={folder.name}
                  >
                    {folderServers.slice(0, 4).map((s) => (
                      <div key={s.id} className="w-full h-full rounded-[4px] overflow-hidden bg-surface-5">
                        {s.iconUrl ? <img src={s.iconUrl} className="w-full h-full object-cover" /> : <span className="text-[8px] text-gray-400 flex items-center justify-center h-full">{s.name?.[0]}</span>}
                      </div>
                    ))}
                    {totalUnread > 0 && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{totalUnread > 9 ? "9+" : totalUnread}</div>}
                  </button>
                  {isExpanded && folderServers.map((sv) => (
                    <ServerIcon key={sv.id} sv={sv} active={activeServerId === sv.id} onClick={() => goServer(sv.id)} getServerUnread={getServerUnread}
                      onContextMenu={(e) => { e.preventDefault(); setFolderMenu({ serverId: sv.id, x: e.clientX, y: e.clientY }); }}
                    />
                  ))}
                </div>
              );
            })}
            {/* Klasörsüz sunucular */}
            {standaloneServers.map((sv) => (
              <ServerIcon key={sv.id} sv={sv} active={activeServerId === sv.id} onClick={() => goServer(sv.id)} getServerUnread={getServerUnread}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setFolderMenu({ serverId: sv.id, x: e.clientX, y: e.clientY });
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Sunucu klasör context menüsü */}
      {folderMenu && createPortal(
        <div
          className="fixed z-[9999] bg-surface-2 border border-border-light rounded-lg shadow-xl shadow-black/40 py-1 min-w-[160px]"
          style={{ top: folderMenu.y, left: folderMenu.x }}
          onMouseLeave={() => setFolderMenu(null)}
        >
          {/* Mevcut klasörlere ekle */}
          {Object.entries(folders).map(([fId, f]) => (
            <button key={fId}
              onClick={() => { addToFolder(fId, folderMenu.serverId); setFolderMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M2 4h4l2-2h6v10H2V4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {f.name}
            </button>
          ))}
          {/* Yeni klasör oluştur */}
          <button
            onClick={() => {
              const name = prompt("Klasör adı:");
              if (name?.trim()) { createFolder(name.trim(), [folderMenu.serverId]); }
              setFolderMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-xs text-accent-light hover:bg-surface-5 flex items-center gap-2"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M12 5v6M9 8h6" strokeLinecap="round"/><path d="M2 4h4l2-2h6v10H2V4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Yeni Klasör
          </button>
          {/* Klasörden çıkar */}
          {folderedServerIds.has(folderMenu.serverId) && (
            <button
              onClick={() => { removeFromFolder(folderMenu.serverId); setFolderMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-surface-5 flex items-center gap-2"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
              Klasörden Çıkar
            </button>
          )}
          <div className="h-px bg-border-light my-1" />
          {/* Sunucu ayarları */}
          <button
            onClick={() => { setActiveServerId(folderMenu.serverId); nav("/app/server-settings"); setFolderMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M8 10a2 2 0 100-4 2 2 0 000 4z"/><path d="M13.5 8a5.5 5.5 0 01-.4 2l1.2 1.5-1.4 1.4L11.4 11.7a5.5 5.5 0 01-2 .4v1.8H7.6v-1.8a5.5 5.5 0 01-2-.4L4.1 12.9l-1.4-1.4L3.9 10a5.5 5.5 0 01-.4-2H1.7V6.4h1.8a5.5 5.5 0 01.4-2L2.7 3.1l1.4-1.4L5.6 2.9a5.5 5.5 0 012-.4V.7h1.8v1.8a5.5 5.5 0 012 .4l1.5-1.2 1.4 1.4-1.2 1.5a5.5 5.5 0 01.4 2h1.8V8h-1.8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sunucu Ayarları
          </button>
          {/* Sunucudan ayrıl */}
          <button
            onClick={async () => {
              const sv = servers.find(s => s.id === folderMenu.serverId);
              if (!confirm(`"${sv?.name || "Sunucu"}" sunucusundan ayrılmak istediğine emin misin?`)) { setFolderMenu(null); return; }
              try {
                await serverApi.leave(folderMenu.serverId);
                toast.success("Sunucudan ayrıldın");
                if (activeServerId === folderMenu.serverId) { setActiveServerId(null); nav(paths.friends); }
                fetchServers();
              } catch (e) { toast.error(e?.response?.data?.message || "Ayrılamadı"); }
              setFolderMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-surface-5 flex items-center gap-2"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 12l4-4-4-4M15 8H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sunucudan Ayrıl
          </button>
        </div>,
        document.body
      )}

      <div className="w-8 h-px bg-border-light my-1" />

      {/* Keşfet */}
      <Link
        to={paths.discover}
        className={`group relative h-12 w-12 grid place-items-center transition-all duration-200 ${
          isDiscoverActive ? "bg-emerald-600 rounded-[16px]" : "bg-surface-4 rounded-[22px] hover:rounded-[16px] hover:bg-emerald-600"
        }`}
        title="Keşfet"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={`w-5 h-5 transition-colors ${isDiscoverActive ? "text-white" : "text-emerald-400 group-hover:text-white"}`}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        {isDiscoverActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] w-1 h-8 bg-white rounded-r-full" />}
      </Link>

      {/* Bot Keşfet */}
      <Link
        to="/app/bots"
        className={`group relative h-12 w-12 grid place-items-center transition-all duration-200 ${
          isBotsActive ? "bg-indigo-600 rounded-[16px]" : "bg-surface-4 rounded-[22px] hover:rounded-[16px] hover:bg-indigo-600"
        }`}
        title="Bot Keşfet"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 transition-colors ${isBotsActive ? "text-white" : "text-indigo-400 group-hover:text-white"}`}>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="9" cy="16" r="1" fill="currentColor" />
          <circle cx="15" cy="16" r="1" fill="currentColor" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {isBotsActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] w-1 h-8 bg-white rounded-r-full" />}
      </Link>

      {/* + Oluştur */}
      <button
        onClick={() => openServerHub({ tab: "create" })}
        className="group h-12 w-12 rounded-[22px] hover:rounded-[16px] bg-surface-4 hover:bg-emerald-600 grid place-items-center transition-all duration-200 mb-2"
        title="Sunucu oluştur / katıl"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/* ── Sunucu İkonu + Hover Popup ── */
function ServerIcon({ sv, active, onClick, getServerUnread, onContextMenu }) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const timerRef = useRef(null);

  const showPopup = () => {
    timerRef.current = setTimeout(() => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 12 });
      setHover(true);
    }, 400);
  };

  const hidePopup = () => {
    clearTimeout(timerRef.current);
    setHover(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={showPopup}
        onMouseLeave={hidePopup}
        className={`group relative h-12 w-12 transition-all duration-200 ${
          active
            ? "rounded-[16px]"
            : "rounded-[22px] hover:rounded-[16px]"
        } bg-surface-4 hover:brightness-110`}
      >
        <div className="w-full h-full overflow-hidden rounded-[inherit]">
          {sv.iconUrl ? (
            <img src={sv.iconUrl} alt={sv.name} className="h-full w-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-300">{sv.name.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        {/* Active indicator pill */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[8px] w-1 h-8 bg-white rounded-r-full" />
        )}
        {/* Unread badge */}
        {(() => {
          const u = getServerUnread ? getServerUnread(sv.id) : 0;
          return u > 0 && !active ? (
            <div className="absolute -bottom-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 border-2 border-surface-0">
              {u > 99 ? "99+" : u}
            </div>
          ) : null;
        })()}
      </button>

      {hover && createPortal(
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999 }}
          className="w-60 rounded-xl overflow-hidden bg-surface-3 border border-border-light shadow-2xl shadow-black/40"
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={hidePopup}
        >
          {/* Banner */}
          <div className="h-16 w-full bg-gradient-to-br from-surface-5 to-surface-3">
            {sv.bannerUrl && (
              <img src={sv.bannerUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          {/* İçerik */}
          <div className="p-3 -mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[22%] overflow-hidden border-2 border-surface-3 bg-surface-4 shrink-0">
                {sv.iconUrl ? (
                  <img src={sv.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[10px] font-bold text-gray-400">
                    {sv.name?.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-[15px] text-white truncate">{sv.name}</div>
            </div>
            {sv.description && (
              <div className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-4">{sv.description}</div>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-gray-500">{sv.memberCount ?? 0} üye</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
