import { useState, useEffect } from "react";
import { listInstalledBots, uninstallBot } from "../../services/botApi";
import ServerBotInstaller from "./ServerBotInstaller";

export default function InstalledBotsList({ serverId }) {
  const [bots, setBots] = useState([]);
  const [showInstaller, setShowInstaller] = useState(false);

  const loadBots = () => {
    listInstalledBots(serverId).then(setBots).catch(() => {});
  };

  useEffect(() => {
    loadBots();
  }, [serverId]);

  const handleUninstall = async (botUserId) => {
    if (!confirm("Bu botu sunucudan kaldirmak istediginize emin misiniz?")) return;
    await uninstallBot(serverId, botUserId);
    setBots((prev) => prev.filter((b) => b.botUserId !== botUserId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Kurulu Botlar</h3>
        <button
          onClick={() => setShowInstaller(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded"
        >
          + Bot Ekle
        </button>
      </div>

      {bots.length === 0 ? (
        <p className="text-gray-400 text-sm">Bu sunucuda kurulu bot yok.</p>
      ) : (
        <div className="space-y-2">
          {bots.map((bot) => (
            <div key={bot.botUserId} className="flex items-center gap-3 bg-gray-700 rounded-lg p-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {bot.botAvatarUrl ? (
                  <img src={bot.botAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  (bot.botDisplayName || bot.botUsername || "B").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{bot.botDisplayName || bot.botUsername}</span>
                  <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">BOT</span>
                </div>
                <p className="text-gray-400 text-xs">
                  {bot.grantedScopes?.length || 0} izin
                </p>
              </div>
              <button
                onClick={() => handleUninstall(bot.botUserId)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Kaldir
              </button>
            </div>
          ))}
        </div>
      )}

      {showInstaller && (
        <ServerBotInstaller
          serverId={serverId}
          onInstalled={loadBots}
          onClose={() => setShowInstaller(false)}
        />
      )}
    </div>
  );
}
