import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useModals } from "../../context/ModalContext";
import { paths } from "../../routes/paths";
import { serverApi } from "../../services/serverApi";

export default function SidebarServers() {
  const { activeServerId, setActiveServerId } = useChat();
  const { openServerHub } = useModals();
  const nav = useNavigate();

  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const goServer = (id) => {
    setActiveServerId(id);
    // Geri tuşu ile dönüş için ayrı kaydet (DM'e geçişte silinmez)
    localStorage.setItem("cl-lastServerId", id);
    nav(paths.chat);
  };

  return (
    <div className="w-16 bg-[#202225] flex flex-col items-center py-3 gap-3">
      {/* DM/Home */}
      <Link
        to={paths.friends}
        className={`h-12 w-12 rounded-2xl grid place-items-center bg-[#2f3136] hover:bg-[#3a3d43] transition
                    ${activeServerId === null ? "ring-2 ring-orange-500" : ""}`}
        title="DM'ler"
        onClick={() => setActiveServerId(null)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-300">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </Link>

      <div className="h-px w-8 bg-[#3a3d43] my-2" />

      {/* Sunucular */}
      {loading ? (
        <div className="text-[10px] text-gray-400">…</div>
      ) : servers.map((sv) => (
        <button
          key={sv.id}
          onClick={() => goServer(sv.id)}
          className={`h-12 w-12 rounded-full overflow-hidden bg-[#2f3136] hover:bg-[#3a3d43] transition
                      ${activeServerId === sv.id ? "ring-2 ring-orange-500" : ""}`}
          title={sv.name}
        >
          {sv.iconUrl ? (
            <img src={sv.iconUrl} alt={sv.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold">{sv.name.substring(0, 2).toUpperCase()}</span>
          )}
        </button>
      ))}

      <div className="mt-auto h-px w-8 bg-[#3a3d43] my-2" />

      {/* Keşfet */}
      <Link
        to={paths.discover}
        className="h-12 w-12 mb-2 rounded-full bg-[#2f3136] hover:bg-[#3a3d43] grid place-items-center transition"
        title="Keşfet"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6 text-emerald-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </Link>

      {/* + Sunucu oluştur/katıl */}
      <button
        onClick={() => openServerHub({ tab: "create" })}
        className="h-12 w-12 rounded-full bg-[#2f3136] hover:bg-[#3a3d43] grid place-items-center"
        title="Sunucu oluştur / katıl"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6 text-emerald-400">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
