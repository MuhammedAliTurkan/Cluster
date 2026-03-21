// src/components/chat/ThreadPanel.jsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuth, api } from "../../context/AuthContext";
import { subscribeTopic, publishApp } from "../../services/ws";
import dmApi from "../../services/dmApi";
import Avatar from "../common/Avatar";
import EmojiPicker from "./EmojiPicker";
import ConfirmDialog from "../modals/ConfirmDialog";
import LinkPreview, { extractUrls } from "./LinkPreview";
import MarkdownContent from "./MarkdownContent";

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Bugun";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Dun";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

function shouldShowHeader(messages, index) {
  if (index === 0) return true;
  const cur = messages[index];
  const prev = messages[index - 1];
  if (prev.deleted) return true;
  const curSender = cur?.sender?.id ?? cur?.senderId;
  const prevSender = prev?.sender?.id ?? prev?.senderId;
  if (curSender !== prevSender) return true;
  const gap = new Date(cur.createdAt) - new Date(prev.createdAt);
  return gap > 5 * 60 * 1000;
}

const PencilIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4m2 0v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4h9.34z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EmojiIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
    <circle cx="8" cy="8" r="7" /><path d="M5.5 6.5h.01M10.5 6.5h.01" strokeLinecap="round" /><path d="M5.5 10a3.5 3.5 0 0 0 5 0" strokeLinecap="round" />
  </svg>
);

export default function ThreadPanel({ threadId, parentMessage, channelId, onClose }) {
  const { user } = useAuth();
  const meId = useMemo(() => user?.id || localStorage.getItem("userId"), [user?.id]);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [threadInfo, setThreadInfo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const lastTypingSent = useRef(0);

  const seenIdsRef = useRef(new Set());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const editRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const reactionBtnRef = useRef(null);

  // Thread bilgisi
  useEffect(() => {
    if (!threadId) return;
    dmApi.getThread(threadId).then(setThreadInfo).catch(() => {});
  }, [threadId]);

  // Mesajlari yukle
  useEffect(() => {
    if (!threadId) return;
    let alive = true;
    seenIdsRef.current = new Set();
    setMessages([]);
    (async () => {
      try {
        const data = await dmApi.listMessages(threadId, { limit: 100 });
        if (!alive) return;
        const dedup = [];
        for (const m of data || []) {
          if (!m?.id || seenIdsRef.current.has(m.id)) continue;
          seenIdsRef.current.add(m.id);
          dedup.push(m);
        }
        setMessages(dedup);
      } catch (e) { console.error("Thread listMessages error:", e); }
    })();
    return () => { alive = false; };
  }, [threadId]);

  // WS
  useEffect(() => {
    if (!threadId) return;
    const unsub = subscribeTopic(`/topic/channels/${threadId}`, (m) => {
      if (m?.type === "TYPING" && m.userId && m.userId !== meId) {
        setTypingUsers((prev) => ({ ...prev, [m.userId]: { displayName: m.displayName, expiresAt: Date.now() + 3500 } }));
        return;
      }
      if (m?.type === "REACTION_UPDATE" && m.messageId) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === m.messageId ? { ...msg, reactions: m.reactions } : msg
        ));
        return;
      }
      if (!m?.id) return;
      setMessages((prev) => {
        const idx = prev.findIndex((p) => p.id === m.id);
        if (idx >= 0) { const u = [...prev]; u[idx] = m; return u; }
        if (seenIdsRef.current.has(m.id)) return prev;
        seenIdsRef.current.add(m.id);
        return [...prev, m];
      });
    });
    return unsub;
  }, [threadId]);

  // Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Typing cleanup
  useEffect(() => {
    const t = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = {};
        for (const [uid, d] of Object.entries(prev)) { if (d.expiresAt > now) next[uid] = d; }
        return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const activeTypers = useMemo(() => {
    const now = Date.now();
    return Object.values(typingUsers).filter((t) => t.expiresAt > now).map((t) => t.displayName);
  }, [typingUsers]);

  const isMine = useCallback((m) => (m?.sender?.id ?? m?.senderId) === meId, [meId]);

  const sendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;
    publishApp(`/app/channels/${threadId}/send`, { content: text, type: "TEXT", parentMessageId: null });
    setInputValue("");
  };

  const toggleReaction = useCallback(async (messageId, emoji) => {
    try {
      await api.post(`/api/channels/${threadId}/messages/${messageId}/reactions`, { emoji });
    } catch (e) { console.warn("Reaction error:", e); }
  }, [threadId]);

  // Edit
  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.content); setTimeout(() => editRef.current?.focus(), 50); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const submitEdit = () => {
    const text = editText.trim();
    if (!text || !editingId) { cancelEdit(); return; }
    publishApp(`/app/channels/${threadId}/edit`, { messageId: editingId, content: text });
    cancelEdit();
  };

  // Delete
  const confirmDelete = () => {
    if (!deleteTarget) return;
    publishApp(`/app/channels/${threadId}/delete`, { messageId: deleteTarget });
    setDeleteTarget(null);
  };

  const parentSender = parentMessage?.sender;

  return (
    <div className="flex flex-col h-full bg-surface-1 border-l border-border/50" style={{ width: 380, minWidth: 320 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-surface-2 shrink-0">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-400 shrink-0">
          <path d="M5 1v14M11 1v14M1 5h14M1 11h14" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-gray-200 truncate flex-1">
          {threadInfo?.title || "Thread"}
        </span>
        <span className="text-[11px] text-gray-500">{messages.length} yanit</span>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {/* Orijinal mesaj */}
      {parentMessage && (
        <div className="px-4 py-3 border-b border-border/30 bg-surface-2/50 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar src={parentSender?.avatarUrl} name={parentSender?.displayName || parentSender?.username} size={20} />
            <span className="text-[12px] font-medium text-gray-300">
              {parentSender?.displayName || parentSender?.username}
            </span>
            <span className="text-[10px] text-gray-600">{fmtTime(parentMessage.createdAt)}</span>
          </div>
          <p className="text-[13px] text-gray-400 line-clamp-3 whitespace-pre-wrap">{parentMessage.content}</p>
        </div>
      )}

      {/* Thread mesajlari */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col min-h-full justify-end">
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              Henuz yanit yok. Ilk yaniti sen yaz!
            </div>
          )}
          {messages.map((m, i) => {
            const mine = isMine(m);
            const sender = m?.sender;
            const displayName = sender?.displayName || sender?.username || "?";
            const isEditing = editingId === m.id;
            const showHeader = shouldShowHeader(messages, i);

            return (
              <div key={m.id} id={`thread-msg-${m.id}`}>
                {m.deleted ? (
                  <div className="px-4 mt-1">
                    <span className="text-[12px] italic text-gray-600">Bu mesaj silindi</span>
                  </div>
                ) : (
                  <div className={`group relative px-4 ${showHeader ? "mt-3" : "mt-0.5"} hover:bg-surface-3/30`}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <Avatar src={sender?.avatarUrl} name={displayName} size={24} />
                        <span className="text-[13px] font-medium text-gray-300">{displayName}</span>
                        {sender?.bot && (
                          <span className="bg-indigo-500 text-white text-[8px] px-1 py-0.5 rounded font-semibold leading-none">BOT</span>
                        )}
                        <span className="text-[10px] text-gray-600">{fmtTime(m.createdAt)}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="ml-8">
                        <textarea
                          ref={editRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          rows={1}
                          className="w-full resize-none bg-surface-3 rounded-lg px-3 py-1.5 text-[13px] text-gray-100 outline-none focus:ring-1 focus:ring-accent leading-5"
                        />
                        <div className="text-[10px] text-gray-500 mt-1">
                          Esc <button onClick={cancelEdit} className="text-accent-light hover:underline">vazgec</button>
                          {" · "} Enter <button onClick={submitEdit} className="text-accent-light hover:underline">kaydet</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${showHeader ? "ml-8" : "ml-8"} text-[13px] text-gray-200 break-words`}>
                        {m.content && <MarkdownContent text={m.content} myId={meId} myUsername={user?.username} />}
                        {m.editedAt && (
                          <span className="text-[9px] text-gray-600 italic ml-1">(duzenlendi)</span>
                        )}
                        {!showHeader && (
                          <span className="text-[10px] text-gray-600 ml-1.5">{fmtTime(m.createdAt)}</span>
                        )}
                        {m.content && extractUrls(m.content).length > 0 && (
                          <LinkPreview text={m.content} />
                        )}
                      </div>
                    )}

                    {/* Reaksiyonlar */}
                    {!m.deleted && m.reactions && m.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 ml-8">
                        {m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => toggleReaction(m.id, r.emoji)}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition ${
                              r.userIds?.includes(meId)
                                ? "bg-accent/20 border-accent/50 text-white"
                                : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[9px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Hover toolbar */}
                    {!isEditing && !m.deleted && (
                      <div className="absolute top-0 right-2 hidden group-hover:flex items-center bg-surface-3 border border-border-light rounded shadow-lg shadow-black/20">
                        <button
                          ref={reactionPickerMsgId === m.id ? reactionBtnRef : undefined}
                          onClick={() => setReactionPickerMsgId(reactionPickerMsgId === m.id ? null : m.id)}
                          className="p-1 hover:bg-surface-5 text-gray-400 hover:text-yellow-400 transition rounded-l"
                          title="Reaksiyon"
                        ><EmojiIcon /></button>
                        {mine && m.createdAt && (Date.now() - new Date(m.createdAt).getTime() < 15 * 60 * 1000) && (
                          <button onClick={() => startEdit(m)} className="p-1 hover:bg-surface-5 text-gray-400 hover:text-white transition" title="Duzenle">
                            <PencilIcon />
                          </button>
                        )}
                        {mine && (
                          <button onClick={() => setDeleteTarget(m.id)} className="p-1 hover:bg-rose-500/15 text-gray-400 hover:text-rose-400 transition rounded-r" title="Sil">
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Typing indicator */}
      {activeTypers.length > 0 && (
        <div className="px-3 py-0.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span><strong className="text-gray-300">{activeTypers[0]}</strong>{activeTypers.length > 1 ? ` +${activeTypers.length - 1}` : ""} yaziyor...</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div className="bg-surface-3 flex items-end rounded-xl border border-border-light/50 focus-within:border-accent/30 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (e.target.value.trim() && threadId) {
                const now = Date.now();
                if (now - lastTypingSent.current > 3000) {
                  lastTypingSent.current = now;
                  publishApp(`/app/channels/${threadId}/typing`, {});
                }
              }
            }}
            placeholder="Thread'e yanit yaz..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            className="flex-1 resize-none bg-transparent text-[13px] text-gray-100 placeholder-gray-500 outline-none px-3 py-2.5 leading-5 max-h-32 overflow-y-auto"
          />
          <button
            ref={emojiBtnRef}
            onClick={() => setShowEmojiPicker((p) => !p)}
            className={`p-2 transition shrink-0 ${showEmojiPicker ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <EmojiIcon />
          </button>
        </div>
      </div>

      {/* Emoji Pickers */}
      {showEmojiPicker && (
        <EmojiPicker
          anchorRef={emojiBtnRef}
          position="top"
          onSelect={(emoji) => { setInputValue((v) => v + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
      {reactionPickerMsgId && (
        <EmojiPicker
          anchorRef={reactionBtnRef}
          position="top"
          onSelect={(emoji) => { toggleReaction(reactionPickerMsgId, emoji); setReactionPickerMsgId(null); }}
          onClose={() => setReactionPickerMsgId(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Mesaji Sil"
        message="Bu mesaji silmek istediginden emin misin?"
        confirmText="Sil"
        cancelText="Vazgec"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
