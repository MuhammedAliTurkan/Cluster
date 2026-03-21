import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateBot, deleteBot, createBotToken, listBotTokens, revokeBotToken } from "../../services/botApi";
import BotScopeSelector from "./BotScopeSelector";
import BotTokenDisplay from "./BotTokenDisplay";

export default function BotSettingsModal({ bot, onClose, onUpdated, onDeleted }) {
  const [displayName, setDisplayName] = useState(bot.displayName || "");
  const [description, setDescription] = useState(bot.description || "");
  const [tokens, setTokens] = useState([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenScopes, setNewTokenScopes] = useState(["READ_MESSAGES", "SEND_MESSAGES"]);
  const [createdToken, setCreatedToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("general"); // general | tokens

  useEffect(() => {
    listBotTokens(bot.id).then(setTokens).catch(() => {});
  }, [bot.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await updateBot(bot.id, { displayName, description });
      onUpdated?.(updated);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu botu silmek istediginize emin misiniz?")) return;
    await deleteBot(bot.id);
    onDeleted?.(bot.id);
    onClose();
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) return;
    try {
      const resp = await createBotToken(bot.id, { name: newTokenName.trim(), scopes: newTokenScopes });
      setCreatedToken(resp.rawToken);
      setNewTokenName("");
      listBotTokens(bot.id).then(setTokens);
    } catch {}
  };

  const handleRevokeToken = async (tokenId) => {
    await revokeBotToken(bot.id, tokenId);
    setTokens((prev) => prev.filter((t) => t.id !== tokenId));
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{bot.username} Ayarlari</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700 pb-1">
          <button
            onClick={() => setTab("general")}
            className={`text-sm pb-1 ${tab === "general" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-gray-400 hover:text-white"}`}
          >
            Genel
          </button>
          <button
            onClick={() => setTab("tokens")}
            className={`text-sm pb-1 ${tab === "tokens" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-gray-400 hover:text-white"}`}
          >
            Tokenlar
          </button>
        </div>

        {tab === "general" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Görünen Ad</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex justify-between pt-2">
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
              >
                Botu Sil
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}

        {tab === "tokens" && (
          <div className="space-y-3">
            {createdToken && (
              <BotTokenDisplay token={createdToken} onClose={() => setCreatedToken(null)} />
            )}

            {/* Existing tokens */}
            {tokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Mevcut Tokenlar</p>
                {tokens.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
                    <div>
                      <span className="text-white text-sm">{t.name}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {t.scopes?.length || 0} izin
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokeToken(t.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      İptal Et
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create new token */}
            <div className="border-t border-gray-700 pt-3 space-y-2">
              <p className="text-sm text-gray-400">Yeni Token Oluştur</p>
              <input
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="Token adi (orn: production)"
                maxLength={50}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
              />
              <BotScopeSelector selected={newTokenScopes} onChange={setNewTokenScopes} />
              <button
                onClick={handleCreateToken}
                disabled={!newTokenName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded disabled:opacity-50"
              >
                Token Oluştur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
