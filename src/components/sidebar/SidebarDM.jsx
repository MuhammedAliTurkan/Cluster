import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dmApi from "../../services/dmApi";
import Avatar from "../common/Avatar";
import UserTray from "../users/UserTray";



function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
  return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

const PLACEHOLDER_TITLES = new Set(["dm", "direct message", "direkt mesaj"]);

function pickOther(ch, me) {
  const meKeys = new Set(
    [me?.id, me?.userId, me?.username, me?.name]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase())
  );

  const users = ch.participants || ch.users || ch.members || [];
  const arr = Array.isArray(users) ? users : [];

  const other = arr.find((u) => {
    if (!u) return false;
    const keys = [u?.id, u?.userId, u?.username, u?.name, u?.displayName]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase());
    return !keys.some((k) => meKeys.has(k));
  });

  if (other) {
    return other.displayName || other.name || other.username || null;
  }
  return null;
}

export default function SidebarDM() {
  const [dms, setDms] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const activeChannelId = useMemo(() => {
    const m = loc.pathname.match(/\/app\/dm\/([^/]+)/);
    return m?.[1] || null;
  }, [loc.pathname]);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const list = await dmApi.listDMs();
        if (!ok) return;
        setDms(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("DM list error:", e);
        setDms([]);
      }
    })();
    return () => { ok = false; };
  }, [loc.pathname]);

  const items = useMemo(() => {
    if (!Array.isArray(dms) || !user) return [];
    return dms.map((ch) => {
      const otherName = pickOther(ch, user);
      const generic = !ch.title || PLACEHOLDER_TITLES.has(String(ch.title).trim().toLowerCase());
      const name = otherName || (generic ? "?" : ch.title);

      const last = ch.lastMessage;
      let preview = "";
      if (last?.content) {
        const sender = last.senderName || "";
        const msg = last.content.length > 40 ? last.content.slice(0, 40) + "…" : last.content;
        preview = sender ? `${sender}: ${msg}` : msg;
      }

      // Karşı kullanıcının avatarUrl'ini bul
      const meKeys = new Set(
        [user?.id, user?.username].filter(Boolean).map(x => String(x).toLowerCase())
      );
      const other = (ch.participants || []).find(p => {
        const keys = [p?.id, p?.username].filter(Boolean).map(x => String(x).toLowerCase());
        return !keys.some(k => meKeys.has(k));
      });

      return {
        id: ch.id,
        name,
        avatarUrl: other?.avatarUrl || null,
        preview,
        time: last?.createdAt || ch.updatedAt,
        isGroup: ch.isGroup,
        memberCount: ch.memberCount,
      };
    });
  }, [dms, user]);

  return (
    <div className="h-full w-full bg-[#0f1621] text-gray-200 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#1b2431]">
        <span className="text-[11px] tracking-wide text-gray-400 uppercase">
          Direkt Mesajlar
        </span>
        <span className="text-[11px] text-gray-500">{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {dms === null && (
          <div className="px-3 py-2 text-sm text-gray-400">Yükleniyor…</div>
        )}
        {Array.isArray(dms) && dms.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            Henüz DM yok
          </div>
        )}

        {items.map((item) => {
          const isActive = activeChannelId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => nav(`/app/dm/${item.id}`)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-3 mb-0.5
                ${isActive
                  ? "bg-[#1b2838] border border-[#2a3f55]"
                  : "hover:bg-[#1b2431] border border-transparent"
                }`}
            >
              <Avatar src={item.avatarUrl} name={item.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-gray-200"}`}>
                    {item.name}
                    {item.isGroup && (
                      <span className="text-[10px] text-gray-500 ml-1">
                        ({item.memberCount})
                      </span>
                    )}
                  </span>
                  {item.time && (
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {timeAgo(item.time)}
                    </span>
                  )}
                </div>
                {item.preview && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {item.preview}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <UserTray />
    </div>
  );
}
