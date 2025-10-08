import { useEffect, useMemo, useState } from "react";
import { useChat } from "../../context/ChatContext";

// Basit MOCK: her sunucu için farklı kısa liste
const MOCK_MEMBERS = {
  s1: [
    { id: "u1", name: "Ahmet", role: "Online" },
    { id: "u2", name: "Zeynep", role: "Online" },
    { id: "u3", name: "Mehmet", role: "Offline" },
  ],
  s2: [
    { id: "u4", name: "Elif", role: "Online" },
    { id: "u5", name: "Can", role: "Idle" },
  ],
};

export default function UserSideBar() {
  const { activeServerId } = useChat();
  const [members, setMembers] = useState([]);

  // sunucu yoksa sidebar'ı hiç göstermeyelim
  if (!activeServerId) return null;

  useEffect(() => {
    // TODO: backend'e bağlanınca burada fetch:
    // GET /api/servers/{activeServerId}/members
    const data = MOCK_MEMBERS[activeServerId] ?? [];
    setMembers(data);
  }, [activeServerId]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      const key = m.role || "Diğer";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return Array.from(map.entries()); // [[role, members[]], ...]
  }, [members]);

  return (
    <aside className="w-64 bg-[#2b2d31] border-l border-[#232428] h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[#232428] text-sm text-gray-300">
        Üyeler
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {grouped.length === 0 ? (
          <div className="text-xs text-gray-400">Bu sunucuda (mock) üye bulunamadı.</div>
        ) : (
          grouped.map(([role, list]) => (
            <div key={role} className="mb-4">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                {role} — {list.length}
              </div>
              <div className="flex flex-col gap-1">
                {list.map((m) => (
                  <div
                    key={m.id}
                    className="px-2 py-2 rounded-md hover:bg-[#3a3d43] text-sm text-gray-200 flex items-center gap-2"
                  >
                    <div className="h-7 w-7 rounded-full bg-[#202225] grid place-items-center text-[11px]">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="leading-4">{m.name}</div>
                      <div className="text-[10px] text-gray-400">{role}</div>
                    </div>
                    {/* gelecekte: sağ tık / hızlı aksiyonlar */}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
