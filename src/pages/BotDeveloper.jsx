import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getMyBots, createBot, deleteBot, updateBot,
  createBotToken, listBotTokens, revokeBotToken,
  BOT_SCOPES
} from "../services/botApi";
import Avatar from "../components/common/Avatar";

/* ── Token gösterimi (sadece oluşturulduğunda) ── */
function TokenReveal({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
      <p className="text-emerald-400 text-sm font-semibold">Token oluşturuldu — sadece bir kez gösterilir!</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-surface-5 text-gray-100 text-xs px-3 py-2 rounded font-mono break-all select-all">
          {token}
        </code>
        <button onClick={copy} className="shrink-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition">
          {copied ? "Kopyalandı!" : "Kopyala"}
        </button>
      </div>
      <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">Kapat</button>
    </div>
  );
}

/* ── Bot Oluştur Modal ── */
function CreateBotModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const bot = await createBot({ name: name.trim(), description: desc.trim(), scopes: ["READ_MESSAGES", "SEND_MESSAGES", "RECEIVE_EVENTS"] });
      const t = await createBotToken(bot.id, { name: "default", scopes: ["READ_MESSAGES", "SEND_MESSAGES", "RECEIVE_EVENTS"] });
      setToken(t.rawToken);
      onCreated?.(bot, t.rawToken);
    } catch (err) {
      setError(err.response?.data?.message || "Bot oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]" onClick={onClose}>
      <div className="bg-surface-3 rounded-xl border border-border-light/30 w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
        {token ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Bot Oluşturuldu!</h2>
            <TokenReveal token={token} onClose={onClose} />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white mb-4">Yeni Bot Oluştur</h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-[13px] text-gray-400 mb-1 block">Bot Adı</label>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={30}
                  className="w-full bg-surface-4 border border-border-light/50 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none focus:border-accent/40"
                  placeholder="MusicBot" />
              </div>
              <div>
                <label className="text-[13px] text-gray-400 mb-1 block">Açıklama</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} rows={2}
                  className="w-full bg-surface-4 border border-border-light/50 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none resize-none focus:border-accent/40"
                  placeholder="Bu bot ne yapar..." />
              </div>
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-[14px] text-gray-400 hover:text-white">Vazgeç</button>
                <button type="submit" disabled={loading || !name.trim()}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-[14px] rounded-lg font-medium disabled:opacity-40 transition">
                  {loading ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Bot Detay Paneli ── */
function BotDetail({ bot, onBack, onUpdated, onDeleted }) {
  const [tab, setTab] = useState("general");
  const [displayName, setDisplayName] = useState(bot.displayName || "");
  const [description, setDescription] = useState(bot.description || "");
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteLink = `${window.location.origin}/app/bot/${bot.id}`;

  useEffect(() => {
    listBotTokens(bot.id).then(setTokens).catch(() => {});
  }, [bot.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateBot(bot.id, { displayName, description });
      onUpdated?.(updated);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu botu silmek istediğinden emin misin? Bu işlem geri alınamaz.")) return;
    await deleteBot(bot.id);
    onDeleted?.(bot.id);
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) return;
    try {
      const resp = await createBotToken(bot.id, { name: newTokenName.trim(), scopes: ["READ_MESSAGES", "SEND_MESSAGES", "RECEIVE_EVENTS"] });
      setCreatedToken(resp.rawToken);
      setNewTokenName("");
      listBotTokens(bot.id).then(setTokens);
    } catch {}
  };

  const handleRevoke = async (tokenId) => {
    await revokeBotToken(bot.id, tokenId);
    setTokens(prev => prev.filter(t => t.id !== tokenId));
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} className="text-gray-400 hover:text-white text-[13px] mb-4 flex items-center gap-1">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Botlarıma Dön
      </button>

      <div className="bg-surface-3 rounded-xl border border-border-light/30 p-5 mb-5">
        <div className="flex items-center gap-4">
          <Avatar src={bot.avatarUrl} name={bot.displayName || bot.username} size={56} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg font-bold text-white">{bot.displayName || bot.username}</span>
              <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">BOT</span>
            </div>
            <p className="text-[13px] text-gray-400">{bot.description || "Açıklama yok"}</p>
          </div>
        </div>

        {/* Davet Linki */}
        <div className="mt-4 bg-surface-4 rounded-lg p-3">
          <p className="text-[12px] text-gray-400 mb-2 font-semibold uppercase tracking-wide">Davet Linki</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-surface-5 text-gray-200 text-[13px] px-3 py-2 rounded font-mono truncate select-all">
              {inviteLink}
            </code>
            <button onClick={copyInviteLink}
              className="shrink-0 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] rounded-lg transition">
              {linkCopied ? "Kopyalandı!" : "Kopyala"}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">Bu linki paylaşarak başkalarının botu sunucularına eklemesini sağla</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface-3 rounded-lg p-1 border border-border-light/20">
        {[
          { id: "general", label: "Genel" },
          { id: "tokens", label: "Tokenlar" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-2 rounded-md text-[13px] font-medium transition ${
              tab === t.id ? "bg-surface-5 text-white" : "text-gray-400 hover:text-white hover:bg-surface-4"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {tab === "general" && (
        <div className="bg-surface-3 rounded-xl border border-border-light/30 p-5 space-y-4">
          <div>
            <label className="text-[13px] text-gray-400 mb-1.5 block">Görünen Ad</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-surface-4 border border-border-light/50 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none focus:border-accent/40" />
          </div>
          <div>
            <label className="text-[13px] text-gray-400 mb-1.5 block">Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full bg-surface-4 border border-border-light/50 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none resize-none focus:border-accent/40" />
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={handleDelete} className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-[13px] rounded-lg transition">
              Botu Sil
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-[14px] rounded-lg font-medium disabled:opacity-40 transition">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Tokens Tab */}
      {tab === "tokens" && (
        <div className="bg-surface-3 rounded-xl border border-border-light/30 p-5 space-y-4">
          {createdToken && (
            <TokenReveal token={createdToken} onClose={() => setCreatedToken(null)} />
          )}

          {/* Mevcut tokenlar */}
          {tokens.length > 0 && (
            <div>
              <p className="text-[13px] text-gray-400 font-semibold mb-2">Mevcut Tokenlar</p>
              <div className="space-y-2">
                {tokens.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-surface-4 rounded-lg px-4 py-2.5">
                    <div>
                      <span className="text-[14px] text-white">{t.name}</span>
                      <span className="text-gray-500 text-[12px] ml-2">{t.scopes?.length || 0} izin</span>
                    </div>
                    <button onClick={() => handleRevoke(t.id)}
                      className="text-rose-400 hover:text-rose-300 text-[12px] transition">
                      İptal Et
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yeni token */}
          <div className="border-t border-border/30 pt-4 space-y-3">
            <p className="text-[13px] text-gray-400 font-semibold">Yeni Token Oluştur</p>
            <input value={newTokenName} onChange={e => setNewTokenName(e.target.value)}
              placeholder="Token adı (örn: production)"
              className="w-full bg-surface-4 border border-border-light/50 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none focus:border-accent/40" />
            <button onClick={handleCreateToken} disabled={!newTokenName.trim()}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-[14px] rounded-lg font-medium disabled:opacity-40 transition">
              Token Oluştur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   ANA SAYFA: Bot Developer Portal
   ══════════════════════════════════════════ */
export default function BotDeveloper() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  const loadBots = useCallback(() => {
    getMyBots()
      .then(setBots)
      .catch(() => setBots([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadBots(); }, [loadBots]);

  if (selectedBot) {
    return (
      <div className="h-full overflow-y-auto bg-surface-2">
        <div className="max-w-3xl mx-auto p-6">
          <BotDetail
            bot={selectedBot}
            onBack={() => { setSelectedBot(null); loadBots(); }}
            onUpdated={(updated) => {
              setBots(prev => prev.map(b => b.id === updated.id ? updated : b));
              setSelectedBot(updated);
            }}
            onDeleted={(id) => {
              setBots(prev => prev.filter(b => b.id !== id));
              setSelectedBot(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-2">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Geliştirici Portalı</h1>
            <p className="text-gray-400 text-[14px]">Botlarını oluştur, yönet ve davet linklerini paylaş</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-[14px] font-medium transition-colors">
            + Yeni Bot Oluştur
          </button>
        </div>

        {/* Bot Listesi */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
        ) : bots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-4 grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-500">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="9" cy="16" r="1" fill="currentColor" />
                <circle cx="15" cy="16" r="1" fill="currentColor" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <p className="text-gray-400 text-[15px] mb-1">Henüz bot oluşturmadın</p>
            <p className="text-gray-500 text-[13px]">İlk botunu oluşturarak başla</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bots.map(bot => (
              <button key={bot.id} onClick={() => setSelectedBot(bot)}
                className="w-full bg-surface-3 border border-border-light/30 rounded-xl p-4 text-left hover:bg-surface-4 hover:border-accent/20 transition-all group">
                <div className="flex items-center gap-4">
                  <Avatar src={bot.avatarUrl} name={bot.displayName || bot.username} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[15px] font-semibold text-white">{bot.displayName || bot.username}</span>
                      <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">BOT</span>
                    </div>
                    <p className="text-[13px] text-gray-400 truncate">{bot.description || "Açıklama yok"}</p>
                  </div>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition shrink-0">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateBotModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadBots(); }}
        />
      )}
    </div>
  );
}
