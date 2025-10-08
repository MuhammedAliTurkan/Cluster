import { useEffect, useMemo, useState } from "react";

const MOCK = [
  { id: "d1", name: "Java Türkiye", members: 24120, tags: ["Java", "Backend"], desc: "Spring, JPA, JVM" },
  { id: "d2", name: "React Global", members: 80312, tags: ["React", "UI"], desc: "Hooks, Tailwind, Vite" },
  { id: "d3", name: "Gaming Corner", members: 120341, tags: ["Games"], desc: "Co-op, turnuvalar!" },
  { id: "d4", name: "AI Playground", members: 45102, tags: ["AI", "ML"], desc: "LLM, PyTorch, kaggle" },
];

export default function Discover() {
  const [q, setQ] = useState("");
  const [list, setList] = useState(MOCK);

  // arama filtrelemesi
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (g) =>
        g.name.toLowerCase().includes(s) ||
        g.desc.toLowerCase().includes(s) ||
        g.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [q, list]);

  useEffect(() => {
    // TODO: backend GET /api/discover?query=...
    // setList(await res.json());
  }, []);

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((g) => (
            <div key={g.id} className="rounded-2xl bg-[#202225] border border-[#2a2a2a] overflow-hidden hover:shadow-lg transition">
              <div className="h-28 w-full bg-gradient-to-br from-orange-500/40 to-orange-700/30" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold">{g.name}</div>
                  <div className="text-xs text-gray-400">{g.members.toLocaleString()} üye</div>
                </div>
                <div className="text-sm text-gray-300 mt-1 line-clamp-2">{g.desc}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.tags.map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full bg-[#2b2d31] text-gray-300 border border-[#3a3d43]">
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    className="px-3 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm"
                    onClick={() => {
                      // TODO: POST /api/servers/{id}/join
                      console.log("join", g.id);
                    }}
                  >
                    Katıl
                  </button>
                  <button
                    className="px-3 py-2 rounded-md bg-[#2b2d31] hover:bg-[#3a3d43] text-gray-200 text-sm"
                    onClick={() => {
                      // TODO: detay modal
                      console.log("detay", g.id);
                    }}
                  >
                    Detay
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-gray-400">Aramana uygun sonuç bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}
