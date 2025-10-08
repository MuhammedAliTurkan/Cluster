import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import * as dmApi from "../../services/dmApi";   // 🔹 EKLENDİ

export default function Navbar() {
  const { activeServerId, activeChannelId } = useChat();
  const loc = useLocation();

  const servers = [];
  const channels = [];

  const activeServer = useMemo(
    () => (Array.isArray(servers) ? servers : []).find(s => s.id === activeServerId) || null,
    [servers, activeServerId]
  );
  const activeChannel = useMemo(
    () => (Array.isArray(channels) ? channels : []).find(c => c.id === activeChannelId) || null,
    [channels, activeChannelId]
  );

  const [dmTitle, setDmTitle] = useState("DM");

  useEffect(() => {
    const m = loc.pathname.match(/\/app\/dm\/([^/]+)/);
    const chId = m?.[1];
    if (!chId) { setDmTitle("DM"); return; }
    let ok = true;
    (async () => {
      try {
        const ch = await dmApi.getChannel(chId);   // 🔹 namespace import sayesinde çağrı
        if (!ok || !ch) return;
        let t = ch.title?.trim();
        if (!t && Array.isArray(ch.participants) && ch.participants.length) {
          const meId = localStorage.getItem("userId");
          const other = ch.participants.find(p => p.id !== meId) || ch.participants[0];
          t = other?.displayName || other?.username || "DM";
        }
        setDmTitle(t || "DM");
      } catch {
        setDmTitle("DM");
      }
    })();
    return () => { ok = false; };
  }, [loc.pathname]);

  const title = useMemo(() => {
    if (loc.pathname.startsWith("/app/friends")) return "Arkadaşlar";
    if (loc.pathname.startsWith("/app/dm/")) return dmTitle;
    if (loc.pathname.startsWith("/app/voice")) return "Ses Kanalı";
    if (loc.pathname.startsWith("/app/video")) return "Video Görüşmesi";
    if (loc.pathname.startsWith("/app/discover")) return "Keşfet";
    if (activeServerId) {
      const sName = activeServer?.name ?? "Sunucu";
      const cName = activeChannel?.name ?? "Kanal";
      return `${sName} • ${cName}`;
    }
    return "Anasayfa";
  }, [loc.pathname, activeServerId, activeServer, activeChannel, dmTitle]);

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a2a] bg-[#1f1f1f]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-white font-semibold truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="text-sm text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-[#2b2b2b] transition"
          onClick={() => console.log("Search open")}
          title="Ara"
        >🔍</button>
        <button
          className="text-sm text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-[#2b2b2b] transition"
          onClick={() => console.log("Settings open")}
          title="Ayarlar"
        >⚙️</button>
      </div>
    </div>
  );
}
