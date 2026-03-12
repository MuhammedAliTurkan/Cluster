import { useEffect, useMemo, useState, useCallback } from "react";
import { serverApi } from "../services/serverApi";

export default function Discover() {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  const fetchServers = useCallback(async (query) => {
    setLoading(true);
    try {
      const data = await serverApi.discover(query || undefined);
      setList(data || []);
    } catch (e) {
      console.error("Discover fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Debounced arama
  useEffect(() => {
    const t = setTimeout(() => fetchServers(q), 400);
    return () => clearTimeout(t);
  }, [q, fetchServers]);

  const joinServer = async (serverId) => {
    setJoining(serverId);
    try {
      await serverApi.joinPublic(serverId);
      // Katıldıktan sonra listeden kaldır veya buton değiştir
      setList((prev) => prev.map((s) => s.id === serverId ? { ...s, joined: true } : s));
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      if (msg?.includes("zaten") || e.response?.status === 200) {
        setList((prev) => prev.map((s) => s.id === serverId ? { ...s, joined: true } : s));
      } else {
        alert(msg || "Katılma başarısız");
      }
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* üst bar */}
      <div className="border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-lg font-semibold">Keşfet</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sunucu ara…"
          className="w-80 max-w-[60vw] p-2 rounded-md bg-[#2b2d31] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && list.length === 0 ? (
          <div className="text-gray-400 text-center mt-12">Yükleniyor…</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((g) => (
              <div key={g.id} className="rounded-2xl bg-[#202225] border border-[#2a2a2a] overflow-hidden hover:shadow-lg transition">
                <div className="h-28 w-full bg-gradient-to-br from-orange-500/40 to-orange-700/30 grid place-items-center">
                  {g.iconUrl ? (
                    <img src={g.iconUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white/60">{g.name?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold truncate">{g.name}</div>
                    <div className="text-xs text-gray-400 shrink-0 ml-2">
                      {(g.memberCount ?? 0).toLocaleString()} üye
                    </div>
                  </div>
                  {g.description && (
                    <div className="text-sm text-gray-300 mt-1 line-clamp-2">{g.description}</div>
                  )}
                  <div className="mt-4">
                    {g.joined ? (
                      <span className="px-3 py-2 rounded-md bg-[#2b2d31] text-green-400 text-sm inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M20 6L9 17l-5-5" /></svg>
                        Katıldın
                      </span>
                    ) : (
                      <button
                        disabled={joining === g.id}
                        className="px-3 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm disabled:opacity-60"
                        onClick={() => joinServer(g.id)}
                      >
                        {joining === g.id ? "Katılıyor…" : "Katıl"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!loading && list.length === 0 && (
              <div className="col-span-full text-gray-400 text-center mt-8">
                {q ? "Aramana uygun sonuç bulunamadı." : "Henüz herkese açık sunucu yok."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
