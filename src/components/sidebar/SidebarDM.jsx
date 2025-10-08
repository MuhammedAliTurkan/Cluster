// src/components/sidebar/SidebarDM.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dmApi from "../../services/dmApi";

export default function SidebarDM() {
  const [dms, setDms] = useState(null); // null=loading
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const list = await dmApi.listDMs();
        if (!ok) return;
        setDms(list);
      } catch (e) {
        console.error("DM list error:", e);
        setDms([]);
      }
    })();
    return () => (ok = false);
  }, [loc.pathname]);

  return (
    <div className="h-full w-64 bg-[#0f1621] text-gray-200 flex flex-col">
      <div className="px-4 py-3 text-xs tracking-wide text-gray-400">DİREKT MESAJLAR</div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {dms === null && <div className="px-2 py-1 text-sm text-gray-400">Yükleniyor…</div>}
        {Array.isArray(dms) && dms.length === 0 && (
          <div className="px-2 py-1 text-sm text-gray-500">Henüz DM yok</div>
        )}
        {Array.isArray(dms) &&
          dms.map(ch => {
            const title = ch.title || "DM";
            return (
              <button
                key={ch.id}
                onClick={() => nav(`/app/dm/${ch.id}`)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1b2431] transition"
                title={title}
              >
                <div className="text-sm truncate">{title}</div>
              </button>
            );
          })}
      </div>
      <div className="p-2"></div>
    </div>
  );
}
