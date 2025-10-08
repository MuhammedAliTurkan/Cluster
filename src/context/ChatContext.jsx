import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState(null);

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
