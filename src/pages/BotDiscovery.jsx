import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPublicBots } from "../services/botApi";
import Avatar from "../components/common/Avatar";

export default function BotDiscovery() {
  const [bots, setBots] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listPublicBots()
      .then(setBots)
      .catch(() => setBots([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bots.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.username?.toLowerCase().includes(q) ||
      b.displayName?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full overflow-y-auto bg-surface-2">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Bot Keşfet</h1>
          <p className="text-gray-400 text-[14px]">Sunucuna ekleyebileceğin botları keşfet</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bot ara..."
            className="w-full bg-surface-3 border border-border-light/50 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none focus:border-accent/40 transition-colors"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
        )}

        {/* Bot Grid */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {search ? "Aramanızla eşleşen bot bulunamadı" : "Henüz kayıtlı bot yok"}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((bot) => (
            <button
              key={bot.id}
              onClick={() => navigate(`/app/bot/${bot.id}`)}
              className="bg-surface-3 border border-border-light/30 rounded-xl p-4 text-left hover:bg-surface-4 hover:border-accent/20 transition-all group"
            >
              <div className="flex items-start gap-3">
                <Avatar src={bot.avatarUrl} name={bot.displayName || bot.username} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-semibold text-white truncate">
                      {bot.displayName || bot.username}
                    </span>
                    <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold leading-none shrink-0">
                      BOT
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-400 line-clamp-2 mb-2">
                    {bot.description || "Açıklama yok"}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{bot.serverCount || 0} sunucu</span>
                    <span>{bot.commands?.length || 0} komut</span>
                  </div>
                </div>
              </div>

              {/* Commands preview */}
              {bot.commands?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {bot.commands.slice(0, 4).map((cmd) => (
                    <span
                      key={cmd.name}
                      className="bg-surface-5/50 text-gray-400 text-[11px] px-2 py-0.5 rounded-md font-mono"
                    >
                      !{cmd.name}
                    </span>
                  ))}
                  {bot.commands.length > 4 && (
                    <span className="text-gray-500 text-[11px] px-1">+{bot.commands.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
