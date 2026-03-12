// src/components/chat/ChatWindow.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribeTopic, publishApp } from "../../services/ws";
import { useCall } from "../../context/CallContext";
import dmApi from "../../services/dmApi";

export default function ChatWindow({ channelId, isDM }) {
  const { user } = useAuth();
  const { startCall, processSignal } = useCall();
  const meId = useMemo(() => user?.id || localStorage.getItem("userId"), [user?.id]);

  const [messages, setMessages] = useState([]);
  const seenIdsRef = useRef(new Set());
  const bottomRef = useRef(null);
  const [startingCall, setStartingCall] = useState(false);

  // Call signals subscription for this DM channel
  useEffect(() => {
    if (!channelId) return;
    const unsub = subscribeTopic(`/topic/channel.${channelId}`, (body) => {
      try { processSignal?.(body); } catch {}
    });
    return unsub;
  }, [channelId, processSignal]);

  // İlk mesajları getir
  useEffect(() => {
    let alive = true;
    seenIdsRef.current = new Set();
    setMessages([]);

    (async () => {
      if (!channelId) return;
      try {
        const data = await dmApi.listMessages(channelId, { limit: 100 });
        if (!alive) return;
        const dedup = [];
        for (const m of data || []) {
          if (!m?.id) continue;
          if (!seenIdsRef.current.has(m.id)) {
            seenIdsRef.current.add(m.id);
            dedup.push(m);
          }
        }
        setMessages(dedup);
      } catch (e) {
        console.error("DM listMessages error:", e);
      }
    })();

    return () => { alive = false; };
  }, [channelId]);

  // WS aboneliği
  useEffect(() => {
    if (!channelId) return;
    const unsub = subscribeTopic(`/topic/channels/${channelId}`, (m) => {
      const id = m?.id;
      if (!id || seenIdsRef.current.has(id)) return;
      seenIdsRef.current.add(id);
      setMessages((prev) => [...prev, m]);
    });
    return unsub;
  }, [channelId]);

  // Aşağı kaydır
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const isMine = useCallback(
    (m) => (m?.sender?.id ?? m?.senderId) === meId,
    [meId]
  );

  const sendMessage = (content) => {
    const text = (content ?? "").trim();
    if (!text) return;
    publishApp(`/app/channels/${channelId}/send`, {
      content: text,
      type: "TEXT",
      parentMessageId: null,
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const v = e.currentTarget.value;
      e.currentTarget.value = "";
      sendMessage(v);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#151515]">
      {/* DM sesli arama butonu */}
      {isDM && channelId && (
        <div className="h-12 flex items-center justify-end gap-2 px-3 border-b border-[#242424] bg-[#181818]">
          <button
            disabled={startingCall}
            onClick={async () => {
              try {
                setStartingCall(true);
                startCall({ channelId, mode: "VOICE" });
              } catch (e) {
                console.error("start voice call error", e);
              } finally {
                setStartingCall(false);
              }
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#2B2B2B] border border-[#3A3A3A] hover:bg-[#3A3A3A] disabled:opacity-60"
            title="Sesli arama başlat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => {
          const mine = isMine(m);
          const username = m?.sender?.username || m?.senderId || "";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  `max-w-[72%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ` +
                  (mine
                    ? "bg-[#3a7afe] text-white rounded-br-md"
                    : "bg-[#2a2a2a] text-gray-100 rounded-bl-md")
                }
                title={`@${username}`}
              >
                {!mine && (
                  <div className="text-xs text-gray-400 mb-1">@{username}</div>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-[#242424] bg-[#1b1b1b]">
        <textarea
          rows={1}
          placeholder="Mesaj yaz..."
          onKeyDown={onKeyDown}
          className="w-full resize-none leading-5 p-3 rounded-xl bg-[#2a2a2a] text-white outline-none focus:ring-2 focus:ring-[#3a7afe]/40"
        />
      </div>
    </div>
  );
}
