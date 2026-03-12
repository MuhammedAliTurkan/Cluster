// src/components/navbar/Navbar.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { serverApi } from "../../services/serverApi";
import * as dmApi from "../../services/dmApi";
import FriendRequestsBell from "../friends/FriendRequestBell";

export default function Navbar({
  onOpenServers,
  onOpenSecondary,
  isDMArea,
  onToggleSidebar,
  onToggleMembers,
  showSidebar,
  showMembers,
  showMemberToggle,
}) {
  const { activeServerId, activeChannelId } = useChat();
  const { logout } = useAuth();
  const loc = useLocation();

  const [dmTitle, setDmTitle] = useState("DM");
  const [serverName, setServerName] = useState("");

  // DM başlığı
  useEffect(() => {
    const m = loc.pathname.match(/\/app\/dm\/([^/]+)/);
    const chId = m?.[1];
    if (!chId) {
      setDmTitle("DM");
      return;
    }
    let ok = true;
    (async () => {
      try {
        const ch = await dmApi.getChannel(chId);
        if (!ok || !ch) return;
        let t = ch.title?.trim();
        if (!t && Array.isArray(ch.participants) && ch.participants.length) {
          const meId = localStorage.getItem("userId");
          const other = ch.participants.find((p) => p.id !== meId) || ch.participants[0];
          t = other?.displayName || other?.username || "DM";
        }
        setDmTitle(t || "DM");
      } catch {
        setDmTitle("DM");
      }
    })();
    return () => { ok = false; };
  }, [loc.pathname]);

  // Sunucu adı
  useEffect(() => {
    if (!activeServerId) {
      setServerName("");
      return;
    }
    let ok = true;
    (async () => {
      try {
        const sv = await serverApi.get(activeServerId);
        if (ok && sv) setServerName(sv.name || "");
      } catch {
        if (ok) setServerName("");
      }
    })();
    return () => { ok = false; };
  }, [activeServerId]);

  const title = useMemo(() => {
    if (loc.pathname.startsWith("/app/friends")) return "Arkadaşlar";
    if (loc.pathname.startsWith("/app/dm/")) return dmTitle;
    if (loc.pathname.startsWith("/app/voice")) return "Ses Kanalı";
    if (loc.pathname.startsWith("/app/video")) return "Video Görüşmesi";
    if (loc.pathname.startsWith("/app/discover")) return "Keşfet";
    if (loc.pathname.startsWith("/app/server-settings")) return "Sunucu Ayarları";
    if (activeServerId) return serverName || "Sunucu";
    return "Anasayfa";
  }, [loc.pathname, activeServerId, dmTitle, serverName]);

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a2a] bg-[#1f1f1f] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobil hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-1.5 rounded hover:bg-[#2b2b2b] transition"
          onClick={onOpenServers}
          title="Menü"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <button
          className="md:hidden text-gray-400 hover:text-white p-1.5 rounded hover:bg-[#2b2b2b] transition"
          onClick={onOpenSecondary}
          title="Kanallar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar toggle (masaüstü) */}
        <button
          className={`hidden md:flex p-1.5 rounded transition ${showSidebar ? "text-white bg-[#2b2b2b]" : "text-gray-400 hover:text-white hover:bg-[#2b2b2b]"}`}
          onClick={onToggleSidebar}
          title={showSidebar ? "Kanalları gizle" : "Kanalları göster"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4.5 h-4.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>

        <span className="text-white font-semibold truncate">{title}</span>
      </div>

      <div className="flex items-center gap-1">
        <FriendRequestsBell />

        {/* Üye paneli toggle */}
        {showMemberToggle && (
          <button
            className={`hidden md:flex p-1.5 rounded transition ${showMembers ? "text-white bg-[#2b2b2b]" : "text-gray-400 hover:text-white hover:bg-[#2b2b2b]"}`}
            onClick={onToggleMembers}
            title={showMembers ? "Üyeleri gizle" : "Üyeleri göster"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        )}

        <button
          onClick={logout}
          className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-[#2b2b2b] transition"
          title="Çıkış yap"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-5 h-5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
