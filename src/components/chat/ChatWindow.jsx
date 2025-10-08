// src/components/chat/ChatWindow.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribeTopic, publishApp } from "../../services/ws";
import dmApi from "../../services/dmApi";

export default function ChatWindow({ channelId }) {
  const { user } = useAuth();
  const meId = useMemo(() => user?.id || localStorage.getItem("userId"), [user?.id]);

  const [messages, setMessages] = useState([]);
  const seenIdsRef = useRef(new Set());
  const bottomRef = useRef(null);

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
    const token = localStorage.getItem("token"); // raw JWT
    publishApp(`/app/channels/${channelId}/send`, {
      token,
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
