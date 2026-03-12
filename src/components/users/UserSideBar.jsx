import { useEffect, useMemo, useState } from "react";
import { useChat } from "../../context/ChatContext";
import { serverApi } from "../../services/serverApi";
import Avatar from "../common/Avatar";

export default function UserSideBar() {
  const { activeServerId } = useChat();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeServerId) { setMembers([]); return; }
    let alive = true;
    setLoading(true);
    serverApi.members(activeServerId)
      .then((data) => {
        if (!alive) return;
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch((e) => console.error("Üyeler yüklenemedi:", e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [activeServerId]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      const roleName = m.role?.name || "Üye";
      if (!map.has(roleName)) map.set(roleName, []);
      map.get(roleName).push(m);
    }
    return Array.from(map.entries());
  }, [members]);

  if (!activeServerId) return null;

  return (
    <aside className="w-full bg-[#2b2d31] h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[#232428] text-sm text-gray-300">
        Üyeler — {members.length}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="text-xs text-gray-400">Yükleniyor...</div>
        ) : grouped.length === 0 ? (
          <div className="text-xs text-gray-400">Üye bulunamadı.</div>
        ) : (
          grouped.map(([role, list]) => (
            <div key={role} className="mb-4">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                {role} — {list.length}
              </div>
              <div className="flex flex-col gap-1">
                {list.map((m) => {
                  const name = m.user?.displayName || m.user?.username || "?";
                  return (
                    <div
                      key={m.id}
                      className="px-2 py-2 rounded-md hover:bg-[#3a3d43] text-sm text-gray-200 flex items-center gap-2"
                    >
                      <Avatar src={m.user?.avatarUrl} name={name} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="leading-4 truncate">{name}</div>
                        <div className="text-[10px] text-gray-400">{role}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
