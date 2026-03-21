import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useChat } from "../../context/ChatContext";
import { usePresence } from "../../context/PresenceContext";
import { useAuth } from "../../context/AuthContext";
import { serverApi } from "../../services/serverApi";

import Avatar from "../common/Avatar";
import HoverProfileCard from "../common/HoverProfileCard";
import toast from "react-hot-toast";

export default function UserSideBar() {
  const { activeServerId, serverData: ctxServerData, members: ctxMembers } = useChat();
  const { getStatus, fetchPresences } = usePresence();
  const { user: me } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const server = ctxServerData;

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null);
  const [showRoles, setShowRoles] = useState(false);
  const ctxRef = useRef(null);

  // Üye arama
  const [memberSearch, setMemberSearch] = useState("");

  // Context'ten gelen members'ı kullan + rolleri çek
  useEffect(() => {
    if (!activeServerId) { setMembers([]); return; }
    const list = Array.isArray(ctxMembers) ? ctxMembers : [];
    setMembers(list);
    const ids = list.map((m) => m.user?.id).filter(Boolean);
    if (ids.length > 0) fetchPresences(ids);
    serverApi.listRoles(activeServerId).then((r) => setRoles((r || []).filter((x) => !x.managed))).catch(() => {});
  }, [activeServerId, ctxMembers]);

  // WebSocket: context zaten /members topic'ini dinliyor ve refreshMembers yapıyor
  // Burada ekstra subscription gerekmiyor

  // Dış tıklama
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e) => {
      if (ctxRef.current?.contains(e.target)) return;
      setCtxMenu(null);
      setShowRoles(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [ctxMenu]);

  const isOwner = server?.owner?.id;

  const openCtx = (e, m) => {
    e.preventDefault();
    e.stopPropagation();
    const userId = m.user?.id;
    if (!userId || userId === isOwner) return; // sunucu sahibine menü yok
    const currentRoleIds = (m.roles?.length > 0 ? m.roles : [m.role].filter(Boolean)).map((r) => r.id);
    const menuH = 120, menuW = 180;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setCtxMenu({ userId, name: m.user?.displayName || m.user?.username || "?", roleIds: currentRoleIds, x, y });
    setShowRoles(false);
  };

  const handleToggleRole = async (roleId) => {
    if (!ctxMenu) return;
    const has = ctxMenu.roleIds.includes(roleId);
    let newIds;
    if (has) {
      newIds = ctxMenu.roleIds.filter((id) => id !== roleId);
      if (newIds.length === 0) return;
    } else {
      newIds = [...ctxMenu.roleIds, roleId];
    }
    try {
      await serverApi.updateMemberRole(activeServerId, ctxMenu.userId, null, newIds);
      setCtxMenu((prev) => prev ? { ...prev, roleIds: newIds } : null);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  };

  const handleKick = async () => {
    if (!ctxMenu) return;
    try {
      await serverApi.removeMember(activeServerId, ctxMenu.userId);
      setCtxMenu(null);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  };

  // Arama filtresi + en yüksek role göre grupla
  const { onlineGrouped, offlineGrouped, onlineCount, offlineCount } = useMemo(() => {
    // Arama filtresi
    const q = memberSearch.trim().toLowerCase();
    const filtered = q
      ? members.filter((m) => {
          const name = (m.nickname || m.user?.displayName || m.user?.username || "").toLowerCase();
          return name.includes(q);
        })
      : members;

    const onlineMembers = [];
    const offlineMembers = [];
    for (const m of filtered) {
      const status = getStatus(m.user?.id);
      (status === "offline" ? offlineMembers : onlineMembers).push(m);
    }
    const groupByHighestRole = (list) => {
      const map = new Map();
      for (const m of list) {
        const highestRole = m.role;
        const roleId = highestRole?.id || "default";
        if (!map.has(roleId)) {
          map.set(roleId, { name: highestRole?.name || "Üye", color: highestRole?.color || "#99aab5", position: highestRole?.position ?? 0, members: [] });
        }
        map.get(roleId).members.push(m);
      }
      return Array.from(map.values()).sort((a, b) => b.position - a.position);
    };
    return {
      onlineGrouped: groupByHighestRole(onlineMembers),
      offlineGrouped: groupByHighestRole(offlineMembers),
      onlineCount: onlineMembers.length,
      offlineCount: offlineMembers.length,
    };
  }, [members, getStatus, memberSearch]);

  if (!activeServerId) return null;

  const isMeOwner = me?.id === isOwner;

  const renderMember = (m) => {
    const name = m.nickname || m.user?.displayName || m.user?.username || "?";
    const status = getStatus(m.user?.id);
    const isOffline = status === "offline";
    const roleCount = m.roles?.length || 0;
    const avatarSrc = m.serverAvatarUrl || m.user?.avatarUrl;

    return (
      <HoverProfileCard key={m.id} user={m.user} roles={m.roles} serverMember={m} placement="left">
        <div
          onContextMenu={(e) => isMeOwner && openCtx(e, m)}
          className={`px-2 py-2 rounded-md hover:bg-surface-5 text-sm flex items-center gap-2 ${
            isOffline ? "opacity-40" : "text-gray-200"
          }`}
        >
          <Avatar src={avatarSrc} name={name} size={28} status={status} />
          <div className="flex-1 min-w-0">
            <div className="leading-4 truncate flex items-center gap-1.5">
              <span style={m.role?.color ? { color: m.role.color } : undefined}>{name}</span>
              {m.user?.bot && (
                <span className="bg-indigo-500 text-white text-[8px] px-1 py-0.5 rounded font-bold leading-none">BOT</span>
              )}
            </div>
          </div>
        </div>
      </HoverProfileCard>
    );
  };

  const renderRoleGroup = (groups) =>
    groups.map((group) => (
      <div key={group.name} className="mb-2">
        <div className="text-[11px] uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
          <span style={{ color: group.color }}>{group.name}</span>
          <span className="text-gray-500"> — {group.members.length}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {group.members.map(renderMember)}
        </div>
      </div>
    ));

  return (
    <aside className="w-full bg-surface-3 h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border space-y-1.5">
        <div className="text-sm text-gray-300">Üyeler — {members.length}</div>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Üye ara..."
            className="w-full bg-surface-2 rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-accent"
          />
          {memberSearch && (
            <button onClick={() => setMemberSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="text-xs text-gray-400">Yükleniyor...</div>
        ) : members.length === 0 ? (
          <div className="text-xs text-gray-400">Üye bulunamadı.</div>
        ) : (
          <>
            {onlineCount > 0 && (
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-green-400 mb-2 px-1">
                  Çevrimiçi — {onlineCount}
                </div>
                {renderRoleGroup(onlineGrouped)}
              </div>
            )}

            {offlineCount > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 px-1">
                  Çevrimdışı — {offlineCount}
                </div>
                {renderRoleGroup(offlineGrouped)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sağ tıklama context menüsü */}
      {ctxMenu && createPortal(
        <div
          ref={ctxRef}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed z-[9999] bg-surface-2 border border-border-light rounded-lg shadow-xl shadow-black/40 py-1 min-w-[170px]"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          {/* Roller */}
          <div className="relative">
            <button
              onClick={() => setShowRoles((p) => !p)}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-surface-5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round"/></svg>
                Roller
              </span>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`w-3 h-3 transition-transform ${showRoles ? "rotate-90" : ""}`}>
                <path d="M6 4l4 4-4 4"/>
              </svg>
            </button>
            {showRoles && (
              <div className="border-t border-border-light/50 py-1 max-h-48 overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="px-3 py-1.5 text-xs text-gray-500">Atanabilir rol yok</div>
                ) : roles.map((r) => {
                  const has = ctxMenu.roleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleToggleRole(r.id)}
                      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition ${has ? "text-white bg-accent/10" : "text-gray-300 hover:bg-surface-5"}`}
                    >
                      <input type="checkbox" checked={has} readOnly className="accent-accent w-3.5 h-3.5 pointer-events-none" />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color || "#99aab5" }} />
                      <span className="truncate">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-border-light my-1" />

          {/* Sunucudan at */}
          <button
            onClick={handleKick}
            className="w-full px-3 py-1.5 text-left text-sm text-rose-400 hover:bg-rose-500/15 flex items-center gap-2"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M10 2l4 4-4 4M14 6H6M2 2v12" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sunucudan At
          </button>
        </div>,
        document.body
      )}
    </aside>
  );
}
