import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicBot, installBot, listInstalledBots, uninstallBot, BOT_SCOPES } from "../services/botApi";
import { serverApi } from "../services/serverApi";
import Avatar from "../components/common/Avatar";

export default function BotProfile() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState([]);
  const [showInstall, setShowInstall] = useState(false);
  const [selectedServer, setSelectedServer] = useState("");
  const [selectedScopes, setSelectedScopes] = useState(new Set(["READ_MESSAGES", "SEND_MESSAGES", "RECEIVE_EVENTS"]));
  const [installing, setInstalling] = useState(false);
  const [installedIn, setInstalledIn] = useState(new Set());

  useEffect(() => {
    if (!botId) return;
    getPublicBot(botId)
      .then(setBot)
      .catch(() => setBot(null))
      .finally(() => setLoading(false));
  }, [botId]);

  // Load user's servers when install modal opens
  useEffect(() => {
    if (!showInstall) return;
    serverApi.myServers()
      .then(async (srvList) => {
        setServers(srvList || []);
        // Check which servers already have the bot
        const installed = new Set();
        for (const srv of srvList || []) {
          try {
            const bots = await listInstalledBots(srv.id);
            if (bots.some((b) => b.botUserId === botId)) {
              installed.add(srv.id);
            }
          } catch {}
        }
        setInstalledIn(installed);
      })
      .catch(() => setServers([]));
  }, [showInstall, botId]);

  const handleInstall = async () => {
    if (!selectedServer || installing) return;
    setInstalling(true);
    try {
      await installBot(selectedServer, botId, Array.from(selectedScopes));
      setInstalledIn((prev) => new Set([...prev, selectedServer]));
      setShowInstall(false);
      setBot((prev) => prev ? { ...prev, serverCount: prev.serverCount + 1 } : prev);
    } catch (e) {
      console.error("Install failed:", e);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (serverId) => {
    try {
      await uninstallBot(serverId, botId);
      setInstalledIn((prev) => {
        const next = new Set(prev);
        next.delete(serverId);
        return next;
      });
      setBot((prev) => prev ? { ...prev, serverCount: Math.max(0, prev.serverCount - 1) } : prev);
    } catch (e) {
      console.error("Uninstall failed:", e);
    }
  };

  const toggleScope = (key) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) return <div className="h-full flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!bot) return <div className="h-full flex items-center justify-center text-gray-500">Bot bulunamadı</div>;

  return (
    <div className="h-full overflow-y-auto bg-surface-2">
      <div className="max-w-3xl mx-auto p-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white text-[13px] mb-4 flex items-center gap-1"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Geri
        </button>

        {/* Bot Header */}
        <div className="bg-surface-3 rounded-xl border border-border-light/30 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar src={bot.avatarUrl} name={bot.displayName || bot.username} size={72} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-white">{bot.displayName || bot.username}</h1>
                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">BOT</span>
              </div>
              <p className="text-gray-400 text-[14px] mb-3">{bot.description || "Açıklama yok"}</p>
              <div className="flex items-center gap-4 text-[13px] text-gray-500">
                <span>{bot.serverCount} sunucu</span>
                <span>{bot.commands?.length || 0} komut</span>
                {bot.owner && <span>Yapımcı: {bot.owner.displayName || bot.owner.username}</span>}
              </div>
            </div>
            <button
              onClick={() => setShowInstall(true)}
              className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-[14px] font-medium transition-colors shrink-0"
            >
              Sunucuya Ekle
            </button>
          </div>
        </div>

        {/* Commands */}
        {bot.commands?.length > 0 && (
          <div className="bg-surface-3 rounded-xl border border-border-light/30 p-5">
            <h2 className="text-[15px] font-semibold text-white mb-3">Komutlar</h2>
            <div className="space-y-2">
              {bot.commands.map((cmd) => (
                <div key={cmd.name} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                  <span className="text-accent-light font-mono text-[14px] shrink-0 min-w-[100px]">!{cmd.name}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-gray-300">{cmd.description}</p>
                    {cmd.usage && (
                      <p className="text-[12px] text-gray-500 mt-0.5 font-mono">{cmd.usage}</p>
                    )}
                  </div>
                  {cmd.category && (
                    <span className="text-[11px] text-gray-500 bg-surface-5/50 px-2 py-0.5 rounded-md shrink-0">
                      {cmd.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Install Modal */}
      {showInstall && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowInstall(false)}>
          <div className="bg-surface-3 rounded-xl border border-border-light/30 w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Sunucuya Ekle</h2>

            {/* Server selector */}
            <label className="text-[13px] text-gray-400 mb-1.5 block">Sunucu Seç</label>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full bg-surface-4 border border-border-light/50 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none mb-4"
            >
              <option value="">Sunucu seçin...</option>
              {servers.map((srv) => (
                <option key={srv.id} value={srv.id} disabled={installedIn.has(srv.id)}>
                  {srv.name} {installedIn.has(srv.id) ? "(zaten yüklü)" : ""}
                </option>
              ))}
            </select>

            {/* Already installed servers */}
            {installedIn.size > 0 && (
              <div className="mb-4">
                <p className="text-[12px] text-gray-500 mb-2">Yüklü olduğu sunucular:</p>
                {servers.filter((s) => installedIn.has(s.id)).map((srv) => (
                  <div key={srv.id} className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-gray-300">{srv.name}</span>
                    <button
                      onClick={() => handleUninstall(srv.id)}
                      className="text-[12px] text-rose-400 hover:text-rose-300"
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scopes */}
            <label className="text-[13px] text-gray-400 mb-1.5 block">İzinler</label>
            <div className="max-h-40 overflow-y-auto bg-surface-4 rounded-lg p-2 mb-4">
              {BOT_SCOPES.map((scope) => (
                <label key={scope.key} className="flex items-center gap-2 py-1 px-1 cursor-pointer hover:bg-surface-5 rounded">
                  <input
                    type="checkbox"
                    checked={selectedScopes.has(scope.key)}
                    onChange={() => toggleScope(scope.key)}
                    className="accent-accent"
                  />
                  <span className="text-[13px] text-gray-300">{scope.label}</span>
                </label>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowInstall(false)}
                className="px-4 py-2 text-[14px] text-gray-400 hover:text-white transition"
              >
                Vazgeç
              </button>
              <button
                onClick={handleInstall}
                disabled={!selectedServer || installing || installedIn.has(selectedServer)}
                className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white px-5 py-2 rounded-lg text-[14px] font-medium transition"
              >
                {installing ? "Yükleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
