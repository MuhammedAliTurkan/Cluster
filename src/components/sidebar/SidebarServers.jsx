import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { paths } from "../../routes/paths";

export default function SidebarServers() {
  const { activeServerId, setActiveServerId } = useChat();
  const nav = useNavigate();

  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = [
          { id: "s1", name: "Turkan Hub", iconUrl: "" },
          { id: "s2", name: "Frontend", iconUrl: "" },
        ];
        if (!cancel) setServers(data);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const goServer = (id) => {
    setActiveServerId(id);
    nav(paths.chat);
  };

  return (
    <div className="w-16 bg-[#202225] flex flex-col items-center py-3 gap-3">
      {/* DM/Home */}
      <Link
        to={paths.friends}
        className={`h-12 w-12 rounded-2xl grid place-items-center bg-[#2f3136] hover:bg-[#3a3d43] transition
                    ${activeServerId === null ? "ring-2 ring-orange-500" : ""}`}
        title="DM’ler"
        onClick={() => setActiveServerId(null)}
      >
        <span className="text-xl">🏠</span>
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
        <span className="text-xl">🔎</span>
      </Link>

      {/* + Sunucu oluştur/katıl -> route tabanlı modal */}
      <button
        onClick={() => nav(`${paths.serverHub}?tab=create`)}
        className="h-12 w-12 rounded-full bg-[#2f3136] hover:bg-[#3a3d43] grid place-items-center text-2xl"
        title="Sunucu oluştur / katıl"
      >
        +
      </button>
    </div>
  );
}
