import { useState } from "react";
import { getMyBots, installBot } from "../../services/botApi";
import BotScopeSelector from "./BotScopeSelector";

export default function ServerBotInstaller({ serverId, onInstalled, onClose }) {
  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [scopes, setScopes] = useState(["READ_MESSAGES", "SEND_MESSAGES", "RECEIVE_EVENTS"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    getMyBots().then((b) => {
      setBots(b);
      setLoaded(true);
    });
  }

  const handleInstall = async () => {
    if (!selectedBotId) return;
    setLoading(true);
    setError("");
    try {
      await installBot(serverId, selectedBotId, scopes);
      onInstalled?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Bot eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Sunucuya Bot Ekle</h2>

        {bots.length === 0 && loaded ? (
          <p className="text-gray-400 text-sm">Henuz botunuz yok. Once bir bot olusturun.</p>
        ) : (
          <>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Bot Sec</label>
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none"
              >
                <option value="">-- Bot secin --</option>
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName || b.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Verilecek Izinler</label>
              <BotScopeSelector selected={scopes} onChange={setScopes} />
            </div>
          </>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">
            Iptal
          </button>
          <button
            onClick={handleInstall}
            disabled={loading || !selectedBotId}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded disabled:opacity-50"
          >
            {loading ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
