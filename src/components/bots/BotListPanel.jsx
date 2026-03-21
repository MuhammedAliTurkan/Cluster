import { useState, useEffect } from "react";
import { getMyBots } from "../../services/botApi";
import CreateBotModal from "./CreateBotModal";
import BotSettingsModal from "./BotSettingsModal";

export default function BotListPanel() {
  const [bots, setBots] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  const loadBots = () => {
    getMyBots().then((data) => {
      console.log("[BotListPanel] loaded bots:", data);
      setBots(data);
    }).catch((err) => {
      console.error("[BotListPanel] error loading bots:", err);
    });
  };

  useEffect(() => {
    loadBots();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Botlarım</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded"
        >
          + Yeni Bot
        </button>
      </div>

      {bots.length === 0 ? (
        <p className="text-gray-400 text-sm">Henuz bot olusturmadiniz.</p>
      ) : (
        <div className="space-y-2">
          {bots.map((bot) => (
            <div
              key={bot.id}
              onClick={() => { console.log("[BotListPanel] clicked bot:", bot); setSelectedBot(bot); }}
              className="flex items-center gap-3 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {bot.avatarUrl ? (
                  <img src={bot.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  (bot.displayName || bot.username || "B").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{bot.displayName || bot.username}</span>
                  <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">BOT</span>
                </div>
                <p className="text-gray-400 text-xs truncate">{bot.description || "Açıklama yok"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBotModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadBots();
          }}
        />
      )}

      {selectedBot && (
        <BotSettingsModal
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
          onUpdated={(updated) => {
            setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            setSelectedBot(null);
          }}
          onDeleted={(id) => {
            setBots((prev) => prev.filter((b) => b.id !== id));
          }}
        />
      )}
    </div>
  );
}
