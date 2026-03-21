// src/components/chat/ChatWindow.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useAuth, api } from "../../context/AuthContext";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import { subscribeTopic, publishApp } from "../../services/ws";
import { useCall } from "../../context/CallContext";
import { useUnread } from "../../context/UnreadContext";
import ConfirmDialog from "../modals/ConfirmDialog";
import Avatar from "../common/Avatar";
import dmApi from "../../services/dmApi";
import unreadApi from "../../services/unreadApi";
import { serverApi } from "../../services/serverApi";
import { useChatTheme } from "../../hooks/useChatTheme";
import { useBgMusic } from "../../hooks/useBgMusic";
import CommandSuggestPopup from "./CommandSuggestPopup";
import MusicControls from "./MusicControls";
import MusicPlayerWidget, { isMusicBotMessage } from "./MusicPlayerWidget";
import EmojiPicker from "./EmojiPicker";
import MentionSuggest from "./MentionSuggest";
import ThreadPanel from "./ThreadPanel";
import LinkPreview, { extractUrls } from "./LinkPreview";
import MarkdownContent from "./MarkdownContent";
import VideoPlayer from "./VideoPlayer";
import GroupDMInfoPanel from "./GroupDMInfoPanel";
import ImageViewer from "./ImageViewer";

/* ── İkonlar ── */
const PencilIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4m2 0v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4h9.34z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ReplyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M6 3L2 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 7h7a5 5 0 0 1 5 5v1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EmojiIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <circle cx="8" cy="8" r="7" /><path d="M5.5 6.5h.01M10.5 6.5h.01" strokeLinecap="round" /><path d="M5.5 10a3.5 3.5 0 0 0 5 0" strokeLinecap="round" />
  </svg>
);
const AttachIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M13.5 7.5l-5.793 5.793a3.5 3.5 0 0 1-4.95-4.95l6.5-6.5a2.333 2.333 0 0 1 3.3 3.3l-6.5 6.5a1.167 1.167 0 0 1-1.65-1.65l5.793-5.793" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ThreadIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M5 1v14M11 1v14M1 5h14M1 11h14" strokeLinecap="round" />
  </svg>
);
const PinIcon = ({ filled }) => (
  <svg viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M9.828 1.172a2 2 0 0 1 2.828 0l2.172 2.172a2 2 0 0 1 0 2.828L12 9l-1 5-4-4-5 5 5-5-4-4 5-1 2.828-2.828z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DownloadIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M8 2v8.5M4.5 7.5L8 11l3.5-3.5M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function fmtFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function downloadFile(url, fileName) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "download";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Zaman formatlama ── */
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
    if (d.toDateString() === today.toDateString()) return "Bugün";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

/* ── Ardışık mesaj gruplama: aynı kişi + 5dk içinde → başlık tekrar gösterilmez ── */
function shouldShowHeader(messages, index) {
  if (index === 0) return true;
  const cur = messages[index];
  const prev = messages[index - 1];
  if (prev.deleted) return true;
  const curSender = cur?.sender?.id ?? cur?.senderId;
  const prevSender = prev?.sender?.id ?? prev?.senderId;
  if (curSender !== prevSender) return true;
  const gap = new Date(cur.createdAt) - new Date(prev.createdAt);
  return gap > 5 * 60 * 1000; // 5 dakika
}

function shouldShowDateSep(messages, index) {
  if (index === 0) return true;
  const curDate = new Date(messages[index].createdAt).toDateString();
  const prevDate = new Date(messages[index - 1].createdAt).toDateString();
  return curDate !== prevDate;
}

export default function ChatWindow({ channelId, isDM, channelInfo, serverData }) {
  const { user } = useAuth();
  const media = useMedia();
  const theme = useChatTheme(serverData);
  const { startCall, processSignal } = useCall();
  const { markRead, setActiveChannel, handleNewMessage } = useUnread();
  const [voiceWarning, setVoiceWarning] = useState(false);
  const meId = useMemo(() => user?.id || localStorage.getItem("userId"), [user?.id]);

  // Arka plan müziği (global — kanal değişse bile çalmaya devam eder)
  const bgMusicUrl = channelInfo?.bgMusicUrl || null;
  const bgMusic = useBgMusic(bgMusicUrl);
  const [showVolSlider, setShowVolSlider] = useState(false);
  const volBtnRef = useRef(null);
  const volPopRef = useRef(null);

  // Slider: dış tıklama ile kapat
  useEffect(() => {
    if (!showVolSlider) return;
    const handler = (e) => {
      if (volBtnRef.current?.contains(e.target)) return;
      if (volPopRef.current?.contains(e.target)) return;
      setShowVolSlider(false);
    };
    // requestAnimationFrame ile geciktir — açma tıklamasını yutmasın
    const raf = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", handler, true);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", handler, true);
    };
  }, [showVolSlider]);

  const [messages, setMessages] = useState([]);
  const seenIdsRef = useRef(new Set());
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [lastReadMsgId, setLastReadMsgId] = useState(null);
  const [viewerImage, setViewerImage] = useState(null); // { src, alt }

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const editRef = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inputValue, setInputValue] = useState(() => {
    if (!channelId) return "";
    try { return JSON.parse(localStorage.getItem("cl-drafts") || "{}")[channelId] || ""; } catch { return ""; }
  });
  const [showCommands, setShowCommands] = useState(false);
  const [cmdPlaceholder, setCmdPlaceholder] = useState(null);
  const [activeCmd, setActiveCmd] = useState(null); // { name, usage, botDisplayName, needsArg }
  const [voiceError, setVoiceError] = useState(null);
  const inputRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, sender }
  const [attachments, setAttachments] = useState([]); // File[] for preview before send
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [canManageChannel, setCanManageChannel] = useState(false);

  // Mesaj arama
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiBtnRef = useRef(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);
  const reactionBtnRef = useRef(null);

  // @Mention autocomplete
  const [mentionQuery, setMentionQuery] = useState(null); // null = kapalı, string = arama
  const [channelMembers, setChannelMembers] = useState([]);

  // Thread
  const [activeThread, setActiveThread] = useState(null); // { threadId, parentMessage }
  const [showThreadList, setShowThreadList] = useState(false);
  const [threadList, setThreadList] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Grup DM info panel
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [dmChannelData, setDmChannelData] = useState(null);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState({}); // { userId: { displayName, expiresAt } }
  const lastTypingSent = useRef(0);

  // Auto-mod bildirimi
  const [autoModWarning, setAutoModWarning] = useState(null);

  // Context menu (sağ tık)
  const [contextMenu, setContextMenu] = useState(null); // { x, y, msg }

  // Pinned mesajlar
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loadingPinned, setLoadingPinned] = useState(false);

  // Kanal yetki kontrolü (sunucu kanallarında)
  useEffect(() => {
    if (isDM || !channelId) { setCanManageChannel(false); return; }
    serverApi.getMyChannelPermissions(channelId)
      .then((p) => setCanManageChannel(!!p?.canManage))
      .catch(() => setCanManageChannel(false));
  }, [channelId, isDM]);

  // Üye listesi (@mention autocomplete için) — ChatContext'ten oku
  const { members: ctxMembers } = useChat();
  useEffect(() => {
    setChannelMembers(ctxMembers || []);
  }, [ctxMembers]);

  // Reaksiyon toggle
  const toggleReaction = useCallback(async (messageId, emoji) => {
    try {
      await api.post(`/api/channels/${channelId}/messages/${messageId}/reactions`, { emoji });
    } catch (e) { console.warn("Reaction error:", e); }
  }, [channelId]);

  // Mesaj arama (debounced)
  useEffect(() => {
    if (!searchOpen) { setSearchResults([]); return; }
    if (!searchQuery.trim() || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await dmApi.searchMessages(channelId, searchQuery.trim());
        setSearchResults(results);
      } catch (e) { console.warn("Search error:", e); setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, searchOpen, channelId]);

  // Kanal değişince aramayı + thread'i + pinned panelini + grup info kapat + typing reset
  useEffect(() => { setSearchOpen(false); setSearchQuery(""); setActiveThread(null); setShowPinned(false); setShowGroupInfo(false); setShowThreadList(false); setTypingUsers({}); setContextMenu(null); }, [channelId]);

  // Context menu dış tıklama ile kapat
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    document.addEventListener("contextmenu", handler);
    return () => { document.removeEventListener("click", handler); document.removeEventListener("contextmenu", handler); };
  }, [contextMenu]);

  // Typing expiry cleanup (her saniye)
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = {};
        for (const [uid, data] of Object.entries(prev)) {
          if (data.expiresAt > now) next[uid] = data;
        }
        return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // DM kanal verisi (grup DM bilgileri için)
  useEffect(() => {
    if (!isDM || !channelId) { setDmChannelData(null); return; }
    dmApi.getChannel(channelId).then(setDmChannelData).catch(() => setDmChannelData(null));
  }, [isDM, channelId]);

  // Aktif kanal takibi (unread context)
  useEffect(() => {
    setActiveChannel(channelId);
    return () => setActiveChannel(null);
  }, [channelId, setActiveChannel]);

  // Taslak kaydetme helper — her yerde kullanılacak
  const saveDraft = useCallback((chId, value) => {
    if (!chId) return;
    try {
      const drafts = JSON.parse(localStorage.getItem("cl-drafts") || "{}");
      if (value && value.trim()) {
        drafts[chId] = value;
      } else {
        delete drafts[chId];
      }
      localStorage.setItem("cl-drafts", JSON.stringify(drafts));
    } catch {}
  }, []);

  // Kanal değiştiğinde taslak yükle
  const prevChannelRef = useRef(channelId);
  useEffect(() => {
    const prev = prevChannelRef.current;
    prevChannelRef.current = channelId;
    if (prev === channelId) return;
    // Yeni kanalın taslağını yükle
    if (channelId) {
      try {
        const draft = JSON.parse(localStorage.getItem("cl-drafts") || "{}")[channelId] || "";
        setInputValue(draft);
      } catch { setInputValue(""); }
    }
  }, [channelId]);

  // Call signals
  useEffect(() => {
    if (!channelId) return;
    const unsub = subscribeTopic(`/topic/channel.${channelId}`, (body) => {
      try { processSignal?.(body); } catch {}
    });
    return unsub;
  }, [channelId, processSignal]);

  // Auto-mod bildirimi
  useEffect(() => {
    const unsub = subscribeTopic("/user/queue/automod", (msg) => {
      if (msg?.channelId === channelId && msg?.reason) {
        setAutoModWarning(msg.reason);
        setTimeout(() => setAutoModWarning(null), 5000);
      }
    });
    return unsub;
  }, [channelId]);

  // İlk mesajları getir
  useEffect(() => {
    let alive = true;
    seenIdsRef.current = new Set();
    setMessages([]);
    setEditingId(null);
    setReplyingTo(null);
    setAttachments([]);
    setHasMore(true);
    setLastReadMsgId(null);
    (async () => {
      if (!channelId) return;
      try {
        // Paralel: mesajlar + son okunan mesaj ID'si
        const [data, stateData] = await Promise.all([
          dmApi.listMessages(channelId, { limit: 50 }),
          unreadApi.getState(channelId).catch(() => null),
        ]);
        if (!alive) return;
        const dedup = [];
        for (const m of data || []) {
          if (!m?.id || seenIdsRef.current.has(m.id)) continue;
          seenIdsRef.current.add(m.id);
          dedup.push(m);
        }
        setMessages(dedup);
        if ((data || []).length < 50) setHasMore(false);
        // Son okunan mesaj ID'sini kaydet — ayrac icin
        if (stateData?.lastReadMessageId) {
          setLastReadMsgId(stateData.lastReadMessageId);
        }
      } catch (e) { console.error("listMessages error:", e); }
    })();
    return () => { alive = false; };
  }, [channelId]);

  // Infinite scroll — yukarı scroll edince eski mesajları yükle
  const loadOlderMessages = useCallback(async () => {
    if (!channelId || !hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const data = await dmApi.listMessages(channelId, { limit: 50, before: oldest.id });
      if (!data || data.length === 0) { setHasMore(false); return; }
      const dedup = [];
      for (const m of data) {
        if (!m?.id || seenIdsRef.current.has(m.id)) continue;
        seenIdsRef.current.add(m.id);
        dedup.push(m);
      }
      if (dedup.length === 0) { setHasMore(false); return; }
      // Scroll pozisyonunu koru
      const container = scrollContainerRef.current;
      const prevHeight = container?.scrollHeight || 0;
      setMessages((prev) => [...dedup, ...prev]);
      if (data.length < 50) setHasMore(false);
      // Scroll restore
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevHeight;
      });
    } catch (e) { console.error("loadOlderMessages error:", e); }
    finally { setLoadingMore(false); }
  }, [channelId, hasMore, loadingMore, messages]);

  // IntersectionObserver ile üstteki sentinel'e ulaşınca eski mesajları yükle
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadOlderMessages(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadOlderMessages]);

  // WS — yeni mesaj + edit/delete
  useEffect(() => {
    if (!channelId) return;
    const unsub = subscribeTopic(`/topic/channels/${channelId}`, (m) => {
      // Typing indicator
      if (m?.type === "TYPING" && m.userId && m.userId !== meId) {
        setTypingUsers((prev) => ({
          ...prev,
          [m.userId]: { displayName: m.displayName, expiresAt: Date.now() + 3500 }
        }));
        return;
      }
      // Reaction update
      if (m?.type === "REACTION_UPDATE" && m.messageId) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === m.messageId ? { ...msg, reactions: m.reactions } : msg
        ));
        return;
      }
      // Pin update
      if (m?.type === "PIN_UPDATE" && m.messageId) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === m.messageId ? { ...msg, pinned: m.pinned } : msg
        ));
        if (showPinned) loadPinnedMessages();
        return;
      }
      // Thread update — reply count güncelle
      if ((m?.type === "THREAD_CREATED" || m?.type === "THREAD_UPDATE") && m.messageId) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === m.messageId ? { ...msg, threadId: m.threadId, threadReplyCount: m.threadReplyCount } : msg
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
      if (m.id) markRead(channelId, m.id, serverData?.id);
    });
    return unsub;
  }, [channelId]);

  // Mesajlar yüklendiğinde / yeni mesaj geldiğinde okundu işaretle
  useEffect(() => {
    if (!channelId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.id) {
      markRead(channelId, lastMsg.id, serverData?.id);
    }
  }, [channelId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const isMine = useCallback((m) => (m?.sender?.id ?? m?.senderId) === meId, [meId]);

  const sendMessage = async (content) => {
    const text = (content ?? "").trim();
    if (!text && attachments.length === 0) return;
    console.log("[ChatWindow] sendMessage:", { channelId, text: text.slice(0, 30), attachments: attachments.length });

    const parentMessageId = replyingTo?.id || null;

    if (attachments.length > 0) {
      try {
        await dmApi.sendMessageWithAttachments(channelId, {
          content: text,
          parentMessageId,
          files: attachments,
        });
      } catch (e) {
        console.error("Upload error:", e);
      }
      setAttachments([]);
    } else {
      publishApp(`/app/channels/${channelId}/send`, {
        content: text,
        type: "TEXT",
        parentMessageId,
      });
    }
    setReplyingTo(null);
    saveDraft(channelId, "");
  };

  // Thread oluştur veya mevcut thread'i aç
  const openThread = async (msg) => {
    if (msg.threadId) {
      // Thread zaten var, aç
      setActiveThread({ threadId: msg.threadId, parentMessage: msg });
    } else {
      // Yeni thread oluştur
      try {
        const thread = await dmApi.createThread(channelId, msg.id);
        setActiveThread({ threadId: thread.id, parentMessage: msg });
        // Mesajı güncelle
        setMessages((prev) => prev.map((m) =>
          m.id === msg.id ? { ...m, threadId: thread.id, threadReplyCount: 0 } : m
        ));
      } catch (e) { console.error("Thread create error:", e); }
    }
  };

  // Thread listesi yükle
  const loadThreadList = async () => {
    setLoadingThreads(true);
    try {
      const data = await dmApi.listThreads(channelId);
      setThreadList(data || []);
    } catch (e) { console.error("Thread list error:", e); setThreadList([]); }
    finally { setLoadingThreads(false); }
  };

  const toggleThreadList = () => {
    if (!showThreadList) loadThreadList();
    setShowThreadList((p) => !p);
  };

  // Pin toggle
  const togglePin = async (msg) => {
    try {
      const updated = await dmApi.togglePin(channelId, msg.id);
      setMessages((prev) => prev.map((m) =>
        m.id === msg.id ? { ...m, pinned: updated.pinned, pinnedAt: updated.pinnedAt } : m
      ));
      // Pinned panel açıksa güncelle
      if (showPinned) loadPinnedMessages();
    } catch (e) { console.error("Pin error:", e); }
  };

  // Pinned mesajları yükle
  const loadPinnedMessages = async () => {
    setLoadingPinned(true);
    try {
      const data = await dmApi.listPinned(channelId);
      setPinnedMessages(data || []);
    } catch (e) { console.error("Pinned error:", e); setPinnedMessages([]); }
    finally { setLoadingPinned(false); }
  };

  // Pinned panel toggle
  const togglePinnedPanel = () => {
    if (!showPinned) loadPinnedMessages();
    setShowPinned((p) => !p);
  };

  const FILE_LIMITS = { image: 10, video: 50, default: 25 }; // MB

  const filterBySize = (files) => {
    const valid = [];
    const rejected = [];
    for (const f of files) {
      const cat = f.type?.startsWith("image/") ? "image" : f.type?.startsWith("video/") ? "video" : "default";
      const limitMB = FILE_LIMITS[cat];
      if (f.size > limitMB * 1024 * 1024) rejected.push(`${f.name} (maks ${limitMB} MB)`);
      else valid.push(f);
    }
    if (rejected.length > 0) {
      toast.error(`Dosya boyutu limiti asildi:\n${rejected.join("\n")}`);
    }
    return valid;
  };

  const handleFileSelect = (e) => {
    const files = filterBySize(Array.from(e.target.files || []));
    if (files.length === 0) return;
    setAttachments((prev) => [...prev, ...files].slice(0, 10));
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = filterBySize(Array.from(e.dataTransfer.files || []));
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files].slice(0, 10));
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const valid = filterBySize(files);
      if (valid.length > 0) {
        setAttachments((prev) => [...prev, ...valid].slice(0, 10));
      }
    }
  };

  // Commands that need an argument
  const CMDS_NEED_ARG = new Set(["play", "remove"]);

  const onInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    saveDraft(channelId, val);
    setVoiceError(null);
    // Typing indicator gönder (3sn debounce)
    if (val.trim() && channelId) {
      const now = Date.now();
      if (now - lastTypingSent.current > 3000) {
        lastTypingSent.current = now;
        publishApp(`/app/channels/${channelId}/typing`, {});
      }
    }
    // Show command popup when text starts with ! and we're in a server (only if no active cmd)
    if (!activeCmd) {
      const showCmd = val.startsWith("!") && !isDM && !!serverData?.id;
      setShowCommands(showCmd);
      if (!val.startsWith("!") || val === "") setCmdPlaceholder(null);
    }
    // @mention detection — cursor pozisyonundaki @ kelimesini bul
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\S*)$/);
    if (match && channelMembers.length > 0) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const onKeyDown = (e) => {
    if (showCommands && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab")) {
      return; // Let CommandSuggestPopup handle these
    }
    // ↑ tuşu ile son mesajı düzenle (input boşken)
    if (e.key === "ArrowUp" && !inputValue.trim() && !activeCmd && !showCommands) {
      const myMsgs = messages.filter((m) => isMine(m) && !m.deleted && m.createdAt && (Date.now() - new Date(m.createdAt).getTime() < 15 * 60 * 1000));
      if (myMsgs.length > 0) {
        e.preventDefault();
        startEdit(myMsgs[myMsgs.length - 1]);
        return;
      }
    }
    if (e.key === "Escape") {
      if (activeCmd) {
        setActiveCmd(null);
        setInputValue("");
        setCmdPlaceholder(null);
        return;
      }
      if (showCommands) setShowCommands(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // Step 1: Command selected from popup, first Enter → enter arg mode
      if (activeCmd) {
        // Step 2: second Enter → send the command
        const arg = inputValue.trim();
        if (activeCmd.needsArg && !arg) return; // need argument
        // Voice channel check
        if (!media.inCall) {
          setVoiceError("Sesli odada olmanız gerek!");
          setTimeout(() => setVoiceError(null), 3000);
          return;
        }
        const fullCmd = "!" + activeCmd.name + (arg ? " " + arg : "");
        sendMessage(fullCmd);
        setInputValue("");
        setActiveCmd(null);
        setCmdPlaceholder(null);
        setShowCommands(false);
        return;
      }

      // If typing a ! command directly (without popup)
      if (inputValue.startsWith("!") && !isDM) {
        const parts = inputValue.trim().split(/\s+/);
        const cmdName = parts[0].slice(1).toLowerCase();
        if (CMDS_NEED_ARG.has(cmdName) && parts.length < 2) {
          // Need argument, enter arg mode
          setActiveCmd({ name: cmdName, needsArg: true, botDisplayName: "Bot" });
          setInputValue("");
          setCmdPlaceholder(cmdName === "play" ? "Sarki adi veya URL" : "Sira numarasi");
          setShowCommands(false);
          inputRef.current?.focus();
          return;
        }
        // Voice check
        if (!media.inCall) {
          setVoiceError("Sesli odada olmanız gerek!");
          setTimeout(() => setVoiceError(null), 3000);
          return;
        }
      }

      // Normal message or command with args already provided
      sendMessage(inputValue);
      setInputValue("");
      setShowCommands(false);
      setCmdPlaceholder(null);
    }
  };

  const onCommandSelect = (cmd) => {
    const needsArg = CMDS_NEED_ARG.has(cmd.name);
    if (needsArg) {
      // Enter arg mode — show template header, wait for arg input
      setActiveCmd({ name: cmd.name, needsArg: true, botDisplayName: cmd.botDisplayName || cmd.botUsername || "Bot", usage: cmd.usage });
      setInputValue("");
      setCmdPlaceholder(cmd.name === "play" ? "Sarki adi veya URL" : cmd.usage?.replace("!" + cmd.name + " ", "") || "Arguman girin");
      setShowCommands(false);
      inputRef.current?.focus();
    } else {
      // No arg needed — voice check then send immediately
      if (!media.inCall) {
        setVoiceError("Sesli odada olmanız gerek!");
        setTimeout(() => setVoiceError(null), 3000);
        setShowCommands(false);
        return;
      }
      sendMessage("!" + cmd.name);
      setInputValue("");
      setShowCommands(false);
      setCmdPlaceholder(null);
      setActiveCmd(null);
    }
  };

  // Edit
  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.content); setTimeout(() => editRef.current?.focus(), 50); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const submitEdit = () => {
    const text = editText.trim();
    if (!text || !editingId) { cancelEdit(); return; }
    console.log("[ChatWindow] edit submit:", { channelId, messageId: editingId, content: text });
    publishApp(`/app/channels/${channelId}/edit`, { messageId: editingId, content: text });
    cancelEdit();
  };
  const editKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === "Escape") cancelEdit();
  };

  // Delete
  const confirmDelete = () => {
    if (!deleteTarget) return;
    publishApp(`/app/channels/${channelId}/delete`, { messageId: deleteTarget });
    setDeleteTarget(null);
  };

  // Aktif typing kullanıcı isimleri
  const activeTypers = useMemo(() => {
    const now = Date.now();
    return Object.values(typingUsers).filter((t) => t.expiresAt > now).map((t) => t.displayName);
  }, [typingUsers]);

  const bgStyle = theme.cssBgStyle
    ? theme.cssBgStyle
    : theme.chatBackgroundUrl
      ? { backgroundImage: `url(${theme.chatBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
      : {};
  const hasBg = !!(theme.chatBackgroundUrl || theme.cssBgStyle);

  return (
    <div className="flex h-full">
    <div className={`flex flex-col ${activeThread ? "flex-1 min-w-0" : "w-full"} h-full bg-surface-2 relative`} style={bgStyle}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent/50 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-accent-light text-lg font-medium">Dosyalari buraya birak</div>
        </div>
      )}

      {/* Kanal bilgi çubuğu — hangi kanalda/DM'de olduğunu gösterir + DM'de arama butonu */}
      {channelInfo && (
        <div className="flex items-center gap-2.5 px-4 py-2 border-b border-border/50 bg-surface-2 shrink-0 relative z-[10]">
          {channelInfo.type === "dm" ? (
            <>
              {dmChannelData?.isGroup ? (
                <div className="w-[22px] h-[22px] rounded-full bg-surface-5 grid place-items-center shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-400">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
              ) : (
                <Avatar src={channelInfo.avatarUrl} name={channelInfo.name} size={22} />
              )}
              <span className="text-[14px] text-gray-200 truncate">{channelInfo.name}</span>
              {dmChannelData?.isGroup && (
                <span className="text-[11px] text-gray-500">({dmChannelData.memberCount})</span>
              )}
              <div className="ml-auto flex items-center gap-1 shrink-0">
                {/* Grup DM bilgi paneli */}
                {dmChannelData?.isGroup && (
                  <button
                    onClick={() => setShowGroupInfo((p) => !p)}
                    className={`p-1.5 rounded-lg hover:bg-surface-5 transition ${showGroupInfo ? "text-accent-light bg-surface-5" : "text-gray-500 hover:text-white"}`}
                    title="Grup bilgileri"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <circle cx="6" cy="6" r="3"/><circle cx="11" cy="7" r="2.5"/><path d="M1 14c0-2.5 2-4 5-4s5 1.5 5 4"/>
                    </svg>
                  </button>
                )}
                {/* Konular (Thread listesi) */}
                <button
                  onClick={toggleThreadList}
                  className={`p-1.5 rounded-lg hover:bg-surface-5 transition ${showThreadList ? "text-accent-light bg-surface-5" : "text-gray-500 hover:text-white"}`}
                  title="Konular"
                >
                  <ThreadIcon />
                </button>
                {/* Sabitlenmiş mesajlar */}
                <button
                  onClick={togglePinnedPanel}
                  className={`p-1.5 rounded-lg hover:bg-surface-5 transition ${showPinned ? "text-yellow-400 bg-surface-5" : "text-gray-500 hover:text-white"}`}
                  title="Sabitlenmiş mesajlar"
                >
                  <PinIcon filled={showPinned} />
                </button>
                {/* Mesaj arama */}
                <button
                  onClick={() => { setSearchOpen((p) => !p); if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 50); }}
                  className={`p-1.5 rounded-lg hover:bg-surface-5 transition ${searchOpen ? "text-accent-light bg-surface-5" : "text-gray-500 hover:text-white"}`}
                  title="Mesaj ara"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                </button>
                {/* Sesli arama */}
                <button
                  disabled={startingCall}
                  onClick={async () => {
                    if (media.voiceState) { setVoiceWarning(true); return; }
                    try { setStartingCall(true); startCall({ channelId, mode: "VOICE" }); }
                    catch (e) { console.error("start call error", e); }
                    finally { setStartingCall(false); }
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface-5 text-gray-500 hover:text-white transition disabled:opacity-40"
                  title="Sesli arama"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              {channelInfo.serverIcon ? (
                <img src={channelInfo.serverIcon} alt="" className="w-5 h-5 rounded-[22%] object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-[22%] bg-surface-5 grid place-items-center text-[9px] text-gray-400">
                  {channelInfo.serverName?.[0]?.toUpperCase()}
                </span>
              )}
              <span className="text-[12px] text-gray-400 truncate">{channelInfo.serverName}</span>
              <svg viewBox="0 0 6 10" className="w-1.5 h-2.5 text-gray-600 shrink-0"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none">
                <path d="M3 2.5h10M3 2.5v2M13 2.5v2M8 2.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span className="text-[14px] text-gray-200 truncate">{channelInfo.name}</span>
              {channelInfo.topic && (
                <>
                  <div className="w-px h-4 bg-border-light mx-1" />
                  <span className="text-[12px] text-gray-500 truncate max-w-[200px]" title={channelInfo.topic}>{channelInfo.topic}</span>
                </>
              )}
              {/* Konular butonu */}
              <button
                onClick={toggleThreadList}
                className={`ml-auto p-1.5 rounded-lg hover:bg-surface-5 transition shrink-0 ${showThreadList ? "text-accent-light bg-surface-5" : "text-gray-500 hover:text-white"}`}
                title="Konular"
              >
                <ThreadIcon />
              </button>
              {/* Sabitlenmiş mesajlar butonu */}
              <button
                onClick={togglePinnedPanel}
                className={`p-1.5 rounded-lg hover:bg-surface-5 transition shrink-0 ${showPinned ? "text-yellow-400 bg-surface-5" : "text-gray-500 hover:text-white"}`}
                title="Sabitlenmiş mesajlar"
              >
                <PinIcon filled={showPinned} />
              </button>
              {/* Mesaj arama butonu */}
              <button
                onClick={() => { setSearchOpen((p) => !p); if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 50); }}
                className={`p-1.5 rounded-lg hover:bg-surface-5 transition shrink-0 ${searchOpen ? "text-accent-light bg-surface-5" : "text-gray-500 hover:text-white"}`}
                title="Mesaj ara"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
              {/* Arka plan müziği butonu */}
              {bgMusic.hasMusic && (
                <div className="ml-auto relative shrink-0">
                  <button
                    ref={volBtnRef}
                    onClick={() => setShowVolSlider((p) => !p)}
                    className={`p-1.5 rounded-lg hover:bg-surface-5 transition ${bgMusic.isStopped ? "text-gray-600" : bgMusic.isMuted ? "text-gray-500" : "text-emerald-400"}`}
                    title="Arka plan müziği"
                  >
                    {bgMusic.isStopped || bgMusic.isMuted ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    )}
                  </button>
                  {showVolSlider && (
                    <div ref={volPopRef} onPointerDown={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-2 border border-border-light rounded-lg shadow-xl shadow-black/40 p-2.5 z-[9999] min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={bgMusic.toggleMute}
                          className={`shrink-0 ${bgMusic.isMuted ? "text-gray-500" : "text-gray-300"}`}
                          title={bgMusic.isMuted ? "Sesi aç" : "Sesi kapat"}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                          </svg>
                        </button>
                        <input
                          type="range"
                          min={0} max={1} step={0.01}
                          value={bgMusic.isMuted ? 0 : bgMusic.volume}
                          onChange={(e) => bgMusic.setVolume(parseFloat(e.target.value))}
                          className="flex-1 h-1 accent-emerald-400 cursor-pointer"
                        />
                        <span className="text-[10px] text-gray-400 w-7 text-right">{bgMusic.isMuted ? 0 : Math.round(bgMusic.volume * 100)}%</span>
                        {bgMusic.isStopped ? (
                          <button onClick={bgMusic.play} className="shrink-0 text-emerald-400 hover:text-emerald-300 transition" title="Oynat">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M4 2l10 6-10 6V2z"/></svg>
                          </button>
                        ) : (
                          <button onClick={bgMusic.stop} className="shrink-0 text-rose-400 hover:text-rose-300 transition" title="Durdur">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Arka plan varken karartma overlay */}
      {hasBg && (
        <div className="absolute inset-0 bg-surface-2" style={{ opacity: 1 - theme.opacity, pointerEvents: "none", zIndex: 0 }} />
      )}

      {/* Arama paneli */}
      {searchOpen && (
        <div className="shrink-0 border-b border-border/50 bg-surface-2 px-4 py-2 relative z-10">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-gray-500 shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
              placeholder="Mesajlarda ara..."
              className="flex-1 bg-surface-3 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-accent"
            />
            {searching && <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />}
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-1 text-gray-500 hover:text-white transition">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSearchOpen(false); setSearchQuery("");
                    const el = document.getElementById(`msg-${r.id}`);
                    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("ring-2", "ring-accent/50"); setTimeout(() => el.classList.remove("ring-2", "ring-accent/50"), 2500); }
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-4 transition flex gap-2"
                >
                  <Avatar src={r.sender?.avatarUrl} name={r.sender?.displayName || r.sender?.username} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-gray-300">{r.sender?.displayName || r.sender?.username}</span>
                      <span className="text-[10px] text-gray-600">{new Date(r.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{r.content}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <div className="mt-2 text-xs text-gray-500 text-center py-2">Sonuç bulunamadı</div>
          )}
        </div>
      )}

      {/* Konular (Thread listesi) paneli */}
      {showThreadList && (
        <div className="shrink-0 border-b border-border/50 bg-surface-2 relative z-10 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 sticky top-0 bg-surface-2 z-10">
            <div className="flex items-center gap-2">
              <ThreadIcon />
              <span className="text-sm font-medium text-gray-200">Konular</span>
              <span className="text-[11px] text-gray-500">({threadList.length})</span>
            </div>
            <button onClick={() => setShowThreadList(false)} className="p-1 text-gray-500 hover:text-white transition">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
          {loadingThreads ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threadList.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Henuz konu yok</div>
          ) : (
            <div className="space-y-0.5">
              {threadList.map((t) => {
                const creator = t.creator;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setShowThreadList(false);
                      // Thread'in parent mesajını bul veya basit obje oluştur
                      const parentMsg = messages.find((m) => m.id === t.parentMessageId);
                      setActiveThread({
                        threadId: t.id,
                        parentMessage: parentMsg || { id: t.parentMessageId, content: t.title, createdAt: t.createdAt }
                      });
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-surface-3/50 transition flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-5 grid place-items-center shrink-0">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-400">
                        <path d="M5 1v14M11 1v14M1 5h14M1 11h14" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-gray-200 truncate">{t.title || "Konu"}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {creator && (
                          <span className="text-[11px] text-gray-500">{creator.displayName || creator.username}</span>
                        )}
                        <span className="text-[11px] text-gray-600">{t.replyCount} yanit</span>
                        {t.lastReplyAt && (
                          <span className="text-[10px] text-gray-600">
                            {new Date(t.lastReplyAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg viewBox="0 0 6 10" className="w-1.5 h-2.5 text-gray-600 shrink-0 self-center"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sabitlenmiş mesajlar paneli */}
      {showPinned && (
        <div className="shrink-0 border-b border-border/50 bg-surface-2 relative z-10 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 sticky top-0 bg-surface-2 z-10">
            <div className="flex items-center gap-2">
              <PinIcon filled />
              <span className="text-sm font-medium text-gray-200">Sabitlenmiş Mesajlar</span>
              <span className="text-[11px] text-gray-500">({pinnedMessages.length})</span>
            </div>
            <button onClick={() => setShowPinned(false)} className="p-1 text-gray-500 hover:text-white transition">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
          {loadingPinned ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Sabitlenmiş mesaj yok</div>
          ) : (
            <div className="space-y-0.5">
              {pinnedMessages.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => {
                    setShowPinned(false);
                    const el = document.getElementById(`msg-${pm.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("ring-2", "ring-yellow-400/50");
                      setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400/50"), 2500);
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-3/50 transition flex gap-2.5"
                >
                  <Avatar src={pm.sender?.avatarUrl} name={pm.sender?.displayName || pm.sender?.username} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-medium text-gray-300">{pm.sender?.displayName || pm.sender?.username}</span>
                      <span className="text-[10px] text-gray-600">{fmtTime(pm.createdAt)}</span>
                    </div>
                    <p className="text-[12px] text-gray-400 line-clamp-2 whitespace-pre-wrap">{pm.content || (pm.attachments?.length ? "Medya" : "...")}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(pm); }}
                    className="p-1 text-yellow-400/60 hover:text-yellow-400 transition shrink-0 self-center"
                    title="Sabitlemeyi kaldır"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mesaj listesi */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative z-[1]">
        <div className="flex flex-col min-h-full justify-end">
          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={topRef} className="flex items-center justify-center py-3">
              {loadingMore && <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
            </div>
          )}
          {/* Empty state — kanal boşsa */}
          {messages.length === 0 && !loadingMore && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-4 grid place-items-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-500">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-lg font-semibold text-gray-300 mb-1">
                {isDM ? "Sohbetin basinda burasisin!"
                  : channelInfo?.type === "topic" ? `"${channelInfo?.name || "Konu"}" konusu`
                  : `#${channelInfo?.name || "kanal"} kanalina hos geldin!`}
              </div>
              <div className="text-sm text-gray-500">
                {isDM ? "Mesaj gondererek sohbete basla."
                  : channelInfo?.type === "topic" ? "Bu konuda henuz mesaj yok. Tartismayi baslat!"
                  : "Bu kanalda henuz mesaj yok. Ilk mesaji sen gonder!"}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const mine = isMine(m);
            const sender = m?.sender;
            const displayName = sender?.displayName || sender?.username || m?.senderId || "?";
            const isEditing = editingId === m.id;
            const showHeader = shouldShowHeader(messages, i);
            const showDate = shouldShowDateSep(messages, i);

            return (
              <div key={m.id} id={`msg-${m.id}`}>
                {/* Yeni mesajlar ayracı — lastReadMsgId'den sonraki ilk mesajda goster */}
                {lastReadMsgId && i > 0 && messages[i - 1]?.id === lastReadMsgId && !isMine(m) && (
                  <div className="flex items-center gap-2 px-4 py-1 my-2">
                    <div className="flex-1 h-px bg-rose-500/50" />
                    <span className="text-[11px] font-semibold text-rose-400 px-2">Yeni mesajlar</span>
                    <div className="flex-1 h-px bg-rose-500/50" />
                  </div>
                )}
                {/* Tarih ayracı */}
                {showDate && (
                  <div className="flex items-center gap-2 px-4 py-2 my-2">
                    <div className="flex-1 h-px bg-border-light" />
                    <span className="text-[11px] font-semibold text-gray-400 px-1">{fmtDate(m.createdAt)}</span>
                    <div className="flex-1 h-px bg-border-light" />
                  </div>
                )}

                {/* Silinmiş mesaj */}
                {m.deleted ? (
                  <div className={`flex ${mine ? "justify-end" : "justify-start"} px-4 ${showHeader ? "mt-3" : "mt-0.5"}`}>
                    <div className="px-3 py-1.5 rounded-xl bg-surface-3/50 border border-border/50">
                      <span className="text-[13px] italic text-gray-600">Bu mesaj silindi</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`group relative flex items-start ${mine ? "justify-end" : "justify-start"} px-4 ${showHeader ? "mt-3" : "mt-0.5"}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, msg: m, mine });
                    }}
                  >
                    {/* Avatar — sadece başkasının mesajında ve header'da */}
                    {!mine && showHeader && (
                      <div className="shrink-0 mr-2.5 mt-0.5 self-end">
                        <Avatar src={sender?.avatarUrl} name={displayName} size={32} />
                      </div>
                    )}
                    {!mine && !showHeader && <div className="w-[34px] shrink-0 mr-2.5" />}

                    <div className={`max-w-[70%] min-w-0 ${mine ? "items-end" : "items-start"} flex flex-col overflow-hidden`}>
                      {/* İsim + zaman — sadece header'da */}
                      {showHeader && (
                        <div className={`flex items-center gap-2 mb-1 ${mine ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[14px] ${mine ? "text-accent-light" : "text-gray-300"}`}>
                            {mine ? "Sen" : displayName}
                          </span>
                          {sender?.bot && (
                            <span className="bg-indigo-500 text-white text-[9px] px-1 py-0.5 rounded font-semibold leading-none">BOT</span>
                          )}
                          <span className="text-[10px] text-gray-600">{fmtTime(m.createdAt)}</span>
                        </div>
                      )}

                      {/* Mesaj balonu */}
                      {isEditing ? (
                        <div className="w-full bg-surface-4 rounded-xl p-2.5">
                          <textarea
                            ref={editRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={editKeyDown}
                            rows={1}
                            className="w-full resize-none bg-surface-3 rounded-lg px-3 py-2 text-[14px] text-gray-100 outline-none focus:ring-1 focus:ring-accent leading-5"
                          />
                          <div className="text-[11px] text-gray-500 mt-1.5 px-0.5">
                            Esc <button onClick={cancelEdit} className="text-accent-light hover:underline">vazgeç</button>
                            {" · "} Enter <button onClick={submitEdit} className="text-accent-light hover:underline">kaydet</button>
                          </div>
                        </div>
                      ) : sender?.bot && m.content && isMusicBotMessage(m.content) ? (
                        <MusicPlayerWidget content={m.content} channelId={channelId} createdAt={m.createdAt} />
                      ) : (
                        <div className={`relative px-3.5 py-2 text-[14px] leading-[1.4] break-words whitespace-pre-wrap overflow-hidden select-text ${
                          mine
                            ? "bg-accent/90 text-white rounded-2xl rounded-br-md"
                            : "bg-surface-3 text-gray-200 rounded-2xl rounded-bl-md"
                        }`}>
                          {m.pinned && (
                            <div className="flex items-center gap-1 mb-1 text-yellow-400/70 text-[10px]">
                              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path d="M9.828 1.172a2 2 0 0 1 2.828 0l2.172 2.172a2 2 0 0 1 0 2.828L12 9l-1 5-4-4-5 5 5-5-4-4 5-1 2.828-2.828z"/>
                              </svg>
                              <span>Sabitlendi</span>
                            </div>
                          )}
                          {m.parentMessage && (
                            <div className="mb-1.5 px-2.5 py-1.5 rounded-lg bg-black/15 border-l-2 border-white/20 cursor-pointer hover:bg-black/20 transition"
                              onClick={() => {
                                const el = document.getElementById(`msg-${m.parentMessage.id}`);
                                if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("ring-2", "ring-accent/50"); setTimeout(() => el.classList.remove("ring-2", "ring-accent/50"), 2000); }
                              }}
                            >
                              <span className="text-[11px] font-medium text-white/60">{m.parentMessage.sender?.displayName || m.parentMessage.sender?.username}</span>
                              <p className="text-[12px] text-white/40 truncate">{m.parentMessage.content || "Medya"}</p>
                            </div>
                          )}
                          {m.content && (
                            <MarkdownContent text={m.content} myId={meId} myUsername={user?.username} mine={mine} />
                          )}
                          {m.content && m.type === "TEXT" && extractUrls(m.content).length > 0 && (
                            <LinkPreview text={m.content} />
                          )}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className={`${m.content ? "mt-2" : ""} flex flex-col gap-1.5`}>
                              {m.attachments.map((att) => {
                                if (att.contentType?.startsWith("image/")) {
                                  return (
                                    <div key={att.id} className="relative group/media inline-block">
                                      <img
                                        src={att.url}
                                        alt={att.fileName}
                                        className="max-w-full max-h-80 rounded-lg cursor-pointer object-contain"
                                        onClick={() => setViewerImage({ src: att.url, alt: att.fileName })}
                                      />
                                      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/media:opacity-100 transition">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); downloadFile(att.url, att.fileName); }}
                                          className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition"
                                          title="İndir"
                                        >
                                          <DownloadIcon className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover/media:opacity-100 transition">
                                        <span className="text-[10px] text-white/80 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">{att.fileName} · {fmtFileSize(att.fileSize)}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                if (att.contentType?.startsWith("video/")) {
                                  return (
                                    <VideoPlayer
                                      key={att.id}
                                      src={att.url}
                                      type={att.contentType}
                                      fileName={att.fileName}
                                      fileSize={att.fileSize}
                                      fmtFileSize={fmtFileSize}
                                      onDownload={() => downloadFile(att.url, att.fileName)}
                                    />
                                  );
                                }
                                if (att.contentType?.startsWith("audio/")) {
                                  return (
                                    <div key={att.id} className="flex flex-col gap-1">
                                      <audio controls className="w-full max-w-xs" preload="metadata">
                                        <source src={att.url} type={att.contentType} />
                                      </audio>
                                      <div className="flex items-center gap-1.5 px-0.5">
                                        <span className="text-[10px] text-white/40 truncate">{att.fileName} · {fmtFileSize(att.fileSize)}</span>
                                        <button
                                          onClick={() => downloadFile(att.url, att.fileName)}
                                          className="text-white/40 hover:text-white/70 transition shrink-0"
                                          title="İndir"
                                        >
                                          <DownloadIcon className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                                // Genel dosya — indirme butonlu kart
                                return (
                                  <div key={att.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-black/15 hover:bg-black/20 transition max-w-xs">
                                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 shrink-0 text-white/50">
                                      <path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M9 1.5V6h4.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[12px] text-white/70 truncate">{att.fileName}</div>
                                      <div className="text-[10px] text-white/40">{fmtFileSize(att.fileSize)}</div>
                                    </div>
                                    <button
                                      onClick={() => downloadFile(att.url, att.fileName)}
                                      className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white/80 rounded-lg transition shrink-0"
                                      title="İndir"
                                    >
                                      <DownloadIcon />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <span className={`inline-flex items-baseline gap-1 ml-2 float-right mt-1.5 -mb-1 ${
                            mine ? "text-white/40" : "text-gray-600"
                          }`}>
                            {m.editedAt && (
                              <span className="text-[9px] italic" title={`Düzenlendi: ${fmtTime(m.editedAt)}`}>düzenlendi</span>
                            )}
                            {!showHeader && (
                              <span className="text-[10px]">{fmtTime(m.createdAt)}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Thread göstergesi — balonun altında */}
                    {!m.deleted && m.threadId && (
                      <button
                        onClick={() => openThread(m)}
                        className={`flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 transition text-[12px] text-accent-light ${mine ? "ml-auto" : ""}`}
                      >
                        <ThreadIcon />
                        <span>{m.threadReplyCount || 0} yanit</span>
                        <svg viewBox="0 0 6 10" className="w-1.5 h-2.5 text-accent-light/60"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
                      </button>
                    )}

                    {/* Reaksiyonlar — balonun altında */}
                    {!m.deleted && m.reactions && m.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                        {m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => toggleReaction(m.id, r.emoji)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition ${
                              r.userIds?.includes(meId)
                                ? "bg-accent/20 border-accent/50 text-white"
                                : "bg-surface-3 border-border-light text-gray-400 hover:bg-surface-4"
                            }`}
                            title={r.userIds?.length + " kişi"}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Hover toolbar — mesajın yanında (mine=solda, other=sağda) */}
                    {!isEditing && !m.deleted && (() => {
                      const canEdit = mine && m.createdAt && (Date.now() - new Date(m.createdAt).getTime() < 15 * 60 * 1000);
                      const isServerOwner = !isDM && serverData?.owner?.id === meId;
                      const canDelete = mine || isServerOwner || canManageChannel;
                      return (
                        <div className={`self-center shrink-0 ${mine ? "order-first mr-1.5" : "ml-1.5"} hidden group-hover:flex items-center bg-surface-3 border border-border-light rounded-lg shadow-xl shadow-black/30`}>
                          {/* Reaksiyon ekle */}
                          <button
                            ref={reactionPickerMsgId === m.id ? reactionBtnRef : undefined}
                            onClick={() => setReactionPickerMsgId(reactionPickerMsgId === m.id ? null : m.id)}
                            className="p-1.5 hover:bg-surface-5 text-gray-400 hover:text-yellow-400 transition rounded-l-lg"
                            title="Reaksiyon ekle"
                          >
                            <EmojiIcon />
                          </button>
                          <button
                            onClick={() => setReplyingTo({ id: m.id, content: m.content, sender: displayName })}
                            className="p-1.5 hover:bg-surface-5 text-gray-400 hover:text-white transition"
                            title="Cevapla"
                          >
                            <ReplyIcon />
                          </button>
                          <button
                            onClick={() => openThread(m)}
                            className="p-1.5 hover:bg-surface-5 text-gray-400 hover:text-white transition"
                            title={m.threadId ? "Thread'i aç" : "Thread oluştur"}
                          >
                            <ThreadIcon />
                          </button>
                          {(mine || canManageChannel || (!isDM && serverData?.owner?.id === meId)) && (
                            <button
                              onClick={() => togglePin(m)}
                              className={`p-1.5 hover:bg-surface-5 transition ${m.pinned ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
                              title={m.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                            >
                              <PinIcon filled={m.pinned} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => startEdit(m)}
                              className="p-1.5 hover:bg-surface-5 text-gray-400 hover:text-white transition"
                              title="Düzenle"
                            >
                              <PencilIcon />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(m.id)}
                              className="p-1.5 hover:bg-rose-500/15 text-gray-400 hover:text-rose-400 transition rounded-r-lg"
                              title="Sil"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Bot-only kanal uyarısı */}
      {channelInfo?.botOnly && (
        <div className="px-4 py-3 bg-indigo-500/10 border-t border-indigo-500/20 text-center">
          <span className="text-sm text-indigo-300">Bu kanal sadece bot komutları içindir</span>
        </div>
      )}

      {/* Yazıyor göstergesi */}
      {activeTypers.length > 0 && (
        <div className="px-4 py-1 shrink-0 relative z-[1]">
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span>
              {activeTypers.length === 1
                ? <><strong className="text-gray-300">{activeTypers[0]}</strong> yazıyor...</>
                : activeTypers.length === 2
                  ? <><strong className="text-gray-300">{activeTypers[0]}</strong> ve <strong className="text-gray-300">{activeTypers[1]}</strong> yazıyor...</>
                  : <><strong className="text-gray-300">{activeTypers[0]}</strong> ve {activeTypers.length - 1} kişi daha yazıyor...</>
              }
            </span>
          </div>
        </div>
      )}

      {/* Mesaj giriş alanı */}
      <div className="px-4 pb-4 pt-1 shrink-0 relative z-[1]">
        <div className="relative">
          {showCommands && serverData?.id && !activeCmd && (
            <CommandSuggestPopup
              serverId={serverData.id}
              query={inputValue.slice(1)}
              onSelect={onCommandSelect}
              onClose={() => setShowCommands(false)}
            />
          )}

          {/* @Mention autocomplete */}
          {mentionQuery !== null && channelMembers.length > 0 && (
            <MentionSuggest
              members={channelMembers.filter((m) => m.user?.id !== user?.id)}
              query={mentionQuery}
              anchorRect={inputRef.current?.getBoundingClientRect()}
              onSelect={(username) => {
                // @query → @username ile değiştir
                const cursor = inputRef.current?.selectionStart || inputValue.length;
                const before = inputValue.slice(0, cursor);
                const after = inputValue.slice(cursor);
                const replaced = before.replace(/@\S*$/, `@${username} `);
                setInputValue(replaced + after);
                setMentionQuery(null);
                setTimeout(() => {
                  const pos = replaced.length;
                  inputRef.current?.setSelectionRange(pos, pos);
                  inputRef.current?.focus();
                }, 0);
              }}
              onClose={() => setMentionQuery(null)}
            />
          )}

          {/* Auto-mod uyarısı */}
          {autoModWarning && (
            <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-amber-500/15 border border-amber-500/30 rounded-lg px-4 py-2.5 flex items-center gap-2 z-50">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-amber-400 shrink-0"><path d="M8 1.5l5.5 2v4c0 3.5-2.5 6-5.5 7.5-3-1.5-5.5-4-5.5-7.5v-4L8 1.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-amber-300">Mesajın engellendi</div>
                <div className="text-[11px] text-amber-400/70">{autoModWarning}</div>
              </div>
              <button onClick={() => setAutoModWarning(null)} className="text-amber-400/50 hover:text-amber-300 shrink-0">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Voice error toast */}
          {voiceError && (
            <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-rose-500/15 border border-rose-500/30 rounded-lg px-4 py-2.5 flex items-center gap-2 animate-pulse">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-400 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-[13px] text-rose-300">{voiceError}</span>
            </div>
          )}

          {/* Reply bar */}
          {replyingTo && (
            <div className="bg-surface-4 border border-accent/20 rounded-t-2xl px-4 py-2 flex items-center gap-2">
              <ReplyIcon />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] text-accent-light font-medium">{replyingTo.sender}</span>
                <p className="text-[12px] text-gray-400 truncate">{replyingTo.content || "Medya"}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-gray-300 shrink-0">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Attachment preview */}
          {attachments.length > 0 && (
            <div className={`bg-surface-4 border border-border-light/50 ${replyingTo ? "border-t-0" : !activeCmd ? "rounded-t-2xl" : ""} px-4 py-2 flex gap-2 overflow-x-auto`}>
              {attachments.map((file, i) => (
                <div key={i} className="relative shrink-0 group/att">
                  {file.type?.startsWith("image/") ? (
                    <img src={URL.createObjectURL(file)} alt={file.name} className="h-16 w-16 rounded-lg object-cover" />
                  ) : file.type?.startsWith("video/") ? (
                    <div className="h-16 w-16 rounded-lg bg-surface-5 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-gray-400">
                        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" opacity="0.4" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-16 px-3 rounded-lg bg-surface-5 flex items-center gap-2">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-400 shrink-0">
                        <path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" strokeLinecap="round"/>
                      </svg>
                      <span className="text-[11px] text-gray-400 truncate max-w-[80px]">{file.name}</span>
                    </div>
                  )}
                  <button onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/att:opacity-100 transition">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active command header */}
          {activeCmd && (
            <div className={`bg-surface-4 border border-indigo-500/20 ${!replyingTo && attachments.length === 0 ? "rounded-t-2xl" : "border-t-0"} px-4 py-2 flex items-center gap-2`}>
              <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">BOT</span>
              <span className="text-indigo-400 font-mono text-[13px]">!{activeCmd.name}</span>
              <span className="text-gray-500 text-[12px]">—</span>
              <span className="text-gray-400 text-[12px] truncate">{activeCmd.usage || "Arguman girin"}</span>
              <button onClick={() => { setActiveCmd(null); setInputValue(""); setCmdPlaceholder(null); }}
                className="ml-auto text-gray-500 hover:text-gray-300 text-[11px] shrink-0">
                ESC
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.zip,.rar,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className={`bg-surface-3 flex items-end border border-border-light/50 focus-within:border-accent/30 transition-colors ${
            (replyingTo || attachments.length > 0 || activeCmd) ? "rounded-b-2xl border-t-0" : "rounded-2xl"
          }`}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-500 hover:text-gray-300 transition shrink-0"
              title="Dosya ekle"
            >
              <AttachIcon />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={onInputChange}
              placeholder={activeCmd ? (cmdPlaceholder || "Arguman girin...") : (cmdPlaceholder || "Mesaj yaz...")}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              className="flex-1 resize-none bg-transparent text-[14px] text-gray-100 placeholder-gray-500 outline-none px-2 py-3 leading-5 max-h-48 overflow-y-auto"
            />
            <button
              ref={emojiBtnRef}
              onClick={() => setShowEmojiPicker((p) => !p)}
              className={`p-2.5 transition shrink-0 ${showEmojiPicker ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"}`}
              title="Emoji"
            >
              <EmojiIcon />
            </button>
            {!isDM && serverData?.id && !activeCmd && (
              <MusicControls channelId={channelId} serverId={serverData.id} />
            )}
          </div>
        </div>
      </div>

      {/* Emoji Picker — input için */}
      {showEmojiPicker && (
        <EmojiPicker
          anchorRef={emojiBtnRef}
          position="top"
          onSelect={(emoji) => { setInputValue((v) => v + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Emoji Picker — reaksiyon için */}
      {reactionPickerMsgId && (
        <EmojiPicker
          anchorRef={reactionBtnRef}
          position="top"
          onSelect={(emoji) => { toggleReaction(reactionPickerMsgId, emoji); setReactionPickerMsgId(null); }}
          onClose={() => setReactionPickerMsgId(null)}
        />
      )}

      {/* Context menu (sağ tık) */}
      {contextMenu && createPortal(
        <div
          className="fixed z-[99999] bg-surface-2 border border-border-light rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {/* Kopyala */}
          <button
            onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content || ""); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M5 11H3a1 1 0 01-1-1V3a1 1 0 011-1h7a1 1 0 011 1v2"/></svg>
            Kopyala
          </button>
          {/* Cevapla */}
          <button
            onClick={() => {
              const s = contextMenu.msg.sender;
              setReplyingTo({ id: contextMenu.msg.id, content: contextMenu.msg.content, sender: s?.displayName || s?.username || "?" });
              setContextMenu(null);
              inputRef.current?.focus();
            }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
          >
            <ReplyIcon /> Cevapla
          </button>
          {/* Thread */}
          <button
            onClick={() => { openThread(contextMenu.msg); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
          >
            <ThreadIcon /> {contextMenu.msg.threadId ? "Thread'i Ac" : "Thread Olustur"}
          </button>
          {/* Reaksiyon */}
          <button
            onClick={() => { setReactionPickerMsgId(contextMenu.msg.id); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
          >
            <EmojiIcon /> Reaksiyon Ekle
          </button>
          {/* Sabitle */}
          {(contextMenu.mine || canManageChannel || (!isDM && serverData?.owner?.id === meId)) && (
            <button
              onClick={() => { togglePin(contextMenu.msg); setContextMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
            >
              <PinIcon filled={contextMenu.msg.pinned} /> {contextMenu.msg.pinned ? "Sabitlemeyi Kaldir" : "Sabitle"}
            </button>
          )}
          {/* Düzenle */}
          {contextMenu.mine && contextMenu.msg.createdAt && (Date.now() - new Date(contextMenu.msg.createdAt).getTime() < 15 * 60 * 1000) && (
            <>
              <div className="h-px bg-border-light my-1" />
              <button
                onClick={() => { startEdit(contextMenu.msg); setContextMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-5 flex items-center gap-2"
              >
                <PencilIcon /> Duzenle
              </button>
            </>
          )}
          {/* Sil */}
          {(contextMenu.mine || (!isDM && serverData?.owner?.id === meId) || canManageChannel) && (
            <button
              onClick={() => { setDeleteTarget(contextMenu.msg.id); setContextMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-surface-5 flex items-center gap-2"
            >
              <TrashIcon /> Sil
            </button>
          )}
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={voiceWarning}
        title="Sesli Kanal Aktif"
        message="Zaten bir sesli kanala bağlısın. Önce mevcut kanaldan ayrılmalısın."
        confirmText="Tamam"
        cancelText={null}
        onConfirm={() => setVoiceWarning(false)}
        onCancel={() => setVoiceWarning(false)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Mesajı Sil"
        message="Bu mesajı silmek istediğinden emin misin? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="Vazgeç"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>

    {/* Image Viewer */}
    {viewerImage && (
      <ImageViewer src={viewerImage.src} alt={viewerImage.alt} onClose={() => setViewerImage(null)} />
    )}

    {/* Thread yan panel */}
    {activeThread && (
      <ThreadPanel
        threadId={activeThread.threadId}
        parentMessage={activeThread.parentMessage}
        channelId={channelId}
        onClose={() => setActiveThread(null)}
      />
    )}

    {/* Grup DM bilgi paneli */}
    {showGroupInfo && dmChannelData?.isGroup && (
      <GroupDMInfoPanel
        channelId={channelId}
        channelData={dmChannelData}
        onClose={() => setShowGroupInfo(false)}
        onUpdated={() => dmApi.getChannel(channelId).then(setDmChannelData).catch(() => {})}
      />
    )}
    </div>
  );
}
