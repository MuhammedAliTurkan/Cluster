import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [activeServerId, setActiveServerId] = useState(
    () => localStorage.getItem("cl-activeServerId") || null
  );
  const [activeChannelId, setActiveChannelId] = useState(
    () => localStorage.getItem("cl-activeChannelId") || null
  );

  // sunucu bazlı son ziyaret edilen kanal
  const [lastVisitedByServer, setLastVisitedByServer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lastVisitedByServer") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("lastVisitedByServer", JSON.stringify(lastVisitedByServer));
  }, [lastVisitedByServer]);

  // Aktif sunucu ve kanalı localStorage'a kaydet
  useEffect(() => {
    if (activeServerId) localStorage.setItem("cl-activeServerId", activeServerId);
    else localStorage.removeItem("cl-activeServerId");
  }, [activeServerId]);

  useEffect(() => {
    if (activeChannelId) localStorage.setItem("cl-activeChannelId", activeChannelId);
    else localStorage.removeItem("cl-activeChannelId");
  }, [activeChannelId]);

  const value = useMemo(
    () => ({
      activeServerId,
      setActiveServerId,
      activeChannelId,
      setActiveChannelId,
      lastVisitedByServer,
      setLastVisitedByServer,
    }),
    [activeServerId, activeChannelId, lastVisitedByServer]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
