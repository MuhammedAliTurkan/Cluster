import { useEffect, useState, useCallback, useRef } from "react";
import dmApi from "../../services/dmApi";
import { subscribeTopic, publishApp } from "../../services/ws";
import { useAuth } from "../../context/AuthContext";
import ChatWindow from "./ChatWindow";
import Avatar from "../common/Avatar";
import toast from "react-hot-toast";

export default function TopicChannelView({ channelId, channelTitle, serverData }) {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]); // mesajlar = konular
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTopics = useCallback(async () => {
    try {
      const msgs = await dmApi.listMessages(channelId, { limit: 100 });
      setTopics((msgs || []).filter((m) => !m.deleted));
    } catch { setTopics([]); }
    finally { setLoading(false); }
  }, [channelId]);

  useEffect(() => {
    setActiveTopic(null);
    setShowNew(false);
    fetchTopics();
  }, [channelId, fetchTopics]);

  // WS ile yeni mesaj gelince listeye ekle
  useEffect(() => {
    if (!channelId) return;
    const unsub = subscribeTopic(`/topic/channels/${channelId}`, (m) => {
      if (!m?.id) return;
      setTopics((prev) => {
        if (prev.some((t) => t.id === m.id)) {
          return prev.map((t) => t.id === m.id ? m : t);
        }
        if (m.deleted) return prev;
        return [...prev, m];
      });
    });
    return unsub;
  }, [channelId]);

  const createTopic = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const content = `**${newTitle.trim()}**${newDesc.trim() ? "\n" + newDesc.trim() : ""}`;
      publishApp(`/app/channels/${channelId}/send`, { content, type: "TEXT" });
      setNewTitle("");
      setNewDesc("");
      setShowNew(false);
      toast.success("Konu oluşturuldu");
    } catch { toast.error("Konu oluşturulamadı"); }
    finally { setCreating(false); }
  };

  // Bir konuya tıklandı — thread'i aç veya oluştur
  const openTopic = async (msg) => {
    if (msg.threadId) {
      setActiveTopic({ threadId: msg.threadId, title: parseTitle(msg.content), msg });
    } else {
      try {
        const thread = await dmApi.createThread(channelId, msg.id, parseTitle(msg.content));
        setTopics((prev) => prev.map((t) => t.id === msg.id ? { ...t, threadId: thread.id, threadReplyCount: 0 } : t));
        setActiveTopic({ threadId: thread.id, title: parseTitle(msg.content), msg });
      } catch { toast.error("Thread oluşturulamadı"); }
    }
  };

  // Konu sohbetindeyse ChatWindow göster
  if (activeTopic) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 bg-surface-2 shrink-0">
          <button onClick={() => setActiveTopic(null)}
            className="p-1.5 rounded-lg hover:bg-surface-5 text-gray-400 hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 text-gray-500">
            <path d="M5 1v14M11 1v14M1 5h14M1 11h14" />
          </svg>
          <span className="text-sm text-gray-200 font-medium truncate">{activeTopic.title || "Konu"}</span>
          {activeTopic.msg?.threadReplyCount != null && (
            <span className="text-[11px] text-gray-500">{activeTopic.msg.threadReplyCount} yanit</span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <ChatWindow channelId={activeTopic.threadId} serverData={serverData} channelInfo={{ name: activeTopic.title || "Konu", type: "topic" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-2">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 shrink-0">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 text-gray-500 shrink-0">
          <path d="M5 1v14M11 1v14M1 5h14M1 11h14" />
        </svg>
        <span className="text-[14px] text-gray-200 font-medium">{channelTitle || "Konular"}</span>
        <span className="text-[11px] text-gray-500">({topics.length})</span>
        <div className="ml-auto">
          <button onClick={() => setShowNew((p) => !p)}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-dark text-white text-xs font-medium transition flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M8 3v10M3 8h10" /></svg>
            Yeni Konu
          </button>
        </div>
      </div>

      {/* Yeni konu formu */}
      {showNew && (
        <div className="px-4 py-3 border-b border-border/30 bg-surface-3/50">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Konu başlığı"
            className="w-full bg-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none border border-border-light focus:border-accent mb-2"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createTopic(); } if (e.key === "Escape") setShowNew(false); }}
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Açıklama (opsiyonel)"
            rows={2}
            className="w-full bg-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none border border-border-light focus:border-accent mb-2 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded-lg bg-surface-4 text-gray-300 text-xs hover:bg-surface-5">İptal</button>
            <button onClick={createTopic} disabled={!newTitle.trim() || creating}
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-dark disabled:opacity-50">
              {creating ? "..." : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      {/* Konu kartları */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-surface-4 grid place-items-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-10 h-10 text-gray-600">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-lg text-gray-400 font-medium mb-1">Henuz konu yok</div>
            <div className="text-sm text-gray-600 mb-4">Yeni bir konu olusturarak tartismayi baslat</div>
            <button onClick={() => setShowNew(true)}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-medium transition">
              + Ilk Konuyu Olustur
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {topics.map((msg) => {
              const title = parseTitle(msg.content) || msg.content?.slice(0, 60) || "Konu";
              const desc = parseDesc(msg.content);
              const sender = msg.sender;
              const replies = msg.threadReplyCount || 0;
              return (
                <button
                  key={msg.id}
                  onClick={() => openTopic(msg)}
                  className="w-full text-left bg-surface-3 border border-border-light/40 rounded-xl p-4 hover:border-accent/30 hover:bg-surface-3/80 transition group"
                >
                  <div className="flex items-start gap-3">
                    {/* İkon */}
                    <div className="w-10 h-10 rounded-lg bg-surface-5 grid place-items-center shrink-0">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-5 h-5 text-accent-light">
                        <path d="M5 1v14M11 1v14M1 5h14M1 11h14" />
                      </svg>
                    </div>
                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white truncate group-hover:text-accent-light transition">
                        {title}
                      </div>
                      {desc && (
                        <div className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{desc}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {sender && (
                          <div className="flex items-center gap-1.5">
                            <Avatar src={sender.avatarUrl} name={sender.displayName || sender.username} size={16} />
                            <span className="text-[11px] text-gray-500">{sender.displayName || sender.username}</span>
                          </div>
                        )}
                        <span className="text-[11px] text-gray-600 flex items-center gap-1">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {replies} yanit
                        </span>
                        {msg.createdAt && (
                          <span className="text-[11px] text-gray-600">
                            {new Date(msg.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Ok */}
                    <svg viewBox="0 0 6 10" className="w-1.5 h-2.5 text-gray-600 group-hover:text-accent-light shrink-0 self-center transition">
                      <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// **başlık** formatından başlığı çıkar
function parseTitle(content) {
  if (!content) return null;
  const match = content.match(/\*\*(.+?)\*\*/);
  return match ? match[1] : null;
}

// Başlıktan sonraki açıklama kısmını çıkar
function parseDesc(content) {
  if (!content) return null;
  const lines = content.split("\n");
  if (lines.length <= 1) return null;
  return lines.slice(1).join("\n").trim() || null;
}
