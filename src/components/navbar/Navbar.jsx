import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { user } = useAuth();
  const { channels, activeChannelId } = useChat();
  const loc = useLocation();

  const ch = channels.find(c => c.id === activeChannelId);
  const title = ch ? (ch.type === "text" ? `# ${ch.name}` : ch.name) : "—";

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-[#333] bg-[#222]">
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-sm">{loc.pathname.includes("voice") ? "Voice" : loc.pathname.includes("video") ? "Video" : "Chat"}</span>
        <span className="text-white font-semibold">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <input
          placeholder="Ara…"
          className="bg-[#2B2B2B] border border-[#3A3A3A] rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <Link to="/settings" className="text-gray-300 hover:text-white">⚙️</Link>
        <div className="flex items-center gap-2 bg-[#2B2B2B] px-2 py-1 rounded">
          <span className="text-lg">{user?.avatar}</span>
          <span className="text-sm">{user?.name}</span>
        </div>
      </div>
    </div>
  );
}
