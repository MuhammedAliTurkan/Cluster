import { useState } from "react";
import { createPortal } from "react-dom";
import { createBot, createBotToken } from "../../services/botApi";
import BotScopeSelector from "./BotScopeSelector";
import BotTokenDisplay from "./BotTokenDisplay";

export default function CreateBotModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopes, setScopes] = useState(["READ_MESSAGES", "SEND_MESSAGES", "RECEIVE_EVENTS"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdToken, setCreatedToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const bot = await createBot({ name: name.trim(), description: description.trim(), scopes });
      // Auto-create a default token
      const tokenResp = await createBotToken(bot.id, { name: "default", scopes });
      setCreatedToken(tokenResp.rawToken);
      onCreated?.(bot);
    } catch (err) {
      setError(err.response?.data?.message || "Bot oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  if (createdToken) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]">
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
          <h2 className="text-lg font-semibold text-white">Bot Oluşturuldu!</h2>
          <BotTokenDisplay token={createdToken} onClose={onClose} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-white">Yeni Bot Oluştur</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Bot Adi</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
              placeholder="ModBot"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Aciklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500 resize-none"
              placeholder="Bu bot ne yapar..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Izinler (Scopes)</label>
            <BotScopeSelector selected={scopes} onChange={setScopes} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded disabled:opacity-50"
            >
              {loading ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
