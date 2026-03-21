// src/components/navbar/Navbar.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useMedia } from "../../context/MediaContext";
import { useAuth } from "../../context/AuthContext";
import * as dmApi from "../../services/dmApi";
import FriendRequestsBell from "../friends/FriendRequestBell";
import ViewMenu from "./ViewMenu";

export default function Navbar({
  onOpenServers,
  onOpenSecondary,
  isDMArea,
  shows,
  
  toggles,
  mediaInCall,
}) {
  const { activeServerId, activeChannelId } = useChat();
  const { voiceSource } = useMedia();
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

  // Sunucu adı — ChatContext'ten oku
  const { serverData } = useChat();
  useEffect(() => {
    setServerName(serverData?.name || "");
  }, [serverData?.name]);

  const title = useMemo(() => {
    if (loc.pathname.startsWith("/app/friends")) return "Arkadaşlar";
    if (loc.pathname.startsWith("/app/dm/")) return dmTitle;
    if (loc.pathname.startsWith("/app/voice")) return voiceSource === "dm" ? "Sesli Arama" : "Ses Kanalı";
    if (loc.pathname.startsWith("/app/video")) return "Video Görüşmesi";
    if (loc.pathname.startsWith("/app/discover")) return "Keşfet";
    if (loc.pathname.startsWith("/app/server-settings")) return "Sunucu Ayarları";
    if (activeServerId) return serverName || "Sunucu";
    return "Anasayfa";
  }, [loc.pathname, activeServerId, dmTitle, serverName, voiceSource]);

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface-2 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobil hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-5 transition"
          onClick={onOpenServers}
          title="Menü"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <button
          className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-5 transition"
          onClick={onOpenSecondary}
          title="Kanallar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="text-white text-[17px] truncate">{title}</span>
      </div>

      <div className="flex items-center gap-0.5">
        {shows && toggles && <ViewButton shows={shows} toggles={toggles} isDMArea={isDMArea} mediaInCall={mediaInCall} />}

        <FriendRequestsBell />

        <button
          onClick={logout}
          className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-surface-5 transition"
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

function ViewButton({ shows, toggles, isDMArea, mediaInCall }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <div className="hidden md:flex">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded-lg transition ${open ? "text-white bg-surface-5" : "text-gray-400 hover:text-white hover:bg-surface-5"}`}
        title="Görünüm"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      {open && (
        <ViewMenu
          shows={shows}

          toggles={toggles}
          isDMArea={isDMArea}
          mediaInCall={mediaInCall}
          onClose={() => setOpen(false)}
          anchorRef={btnRef}
        />
      )}
    </div>
  );
}
