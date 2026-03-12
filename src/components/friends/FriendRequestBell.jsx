import { useEffect, useRef, useState } from "react";
import friendsApi from "../../services/friendsApi";

export default function FriendRequestsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [incoming, setIncoming] = useState([]); // [{id, fromUser:{id,username,displayName,avatarUrl}, ...}]
  const panelRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const list = await friendsApi.getIncoming();
      setIncoming(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // 20sn polling
    return () => clearInterval(t);
  }, []);

  // panel dışına tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onAccept = async (id) => {
    await friendsApi.accept(id);
    setIncoming((arr) => arr.filter((x) => x.id !== id));
  };

  const onReject = async (id) => {
    await friendsApi.reject(id);
    setIncoming((arr) => arr.filter((x) => x.id !== id));
  };

  const badge = incoming.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition focus:outline-none"
        aria-label="Arkadaş istekleri"
        title="Arkadaş istekleri"
      >
        {/* Bell icon (heroicons outline) */}
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.31 6.022c1.766.68 3.63 1.128 5.545 1.31M10 20a2 2 0 1 0 4 0"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        {!!badge && (
          <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-xl border border-white/10 bg-[#0f1621] shadow-xl overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm font-medium">Gelen istekler</div>
            <button
              onClick={load}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
            >
              Yenile
            </button>
          </div>

          {loading && (
            <div className="px-3 py-3 text-sm text-gray-400">Yükleniyor…</div>
          )}

          {!loading && incoming.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400">
              Bekleyen istek yok.
            </div>
          )}

          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {incoming.map((r) => {
              const u = r.fromUser || {};
              const name = u.displayName || u.username || "Kullanıcı";
              const tag = u.username ? `@${u.username}` : "";
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-3">
                  <Avatar url={u.avatarUrl} name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-xs text-gray-400 truncate">{tag}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onAccept(r.id)}
                      className="px-2.5 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500"
                    >
                      Kabul
                    </button>
                    <button
                      onClick={() => onReject(r.id)}
                      className="px-2.5 py-1.5 text-xs rounded bg-rose-600 hover:bg-rose-500"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-9 h-9 rounded-full object-cover bg-white/5"
      />
    );
  }
  const init = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-sm text-white/80">
      {init}
    </div>
  );
}
