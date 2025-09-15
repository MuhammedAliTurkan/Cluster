import { createContext, useContext, useMemo, useState } from "react";

const ChatContext = createContext(null);
export const useChat = () => useContext(ChatContext);

const sampleServers = [
  { id: "s1", name: "Pomodev", icon: "🍊" },
  { id: "s2", name: "Frontend", icon: "💻" },
  { id: "s3", name: "Gaming", icon: "🎮" },
];

const sampleChannels = [
  { id: "c1", serverId: "s1", type: "text", name: "genel" },
  { id: "c2", serverId: "s1", type: "text", name: "duyurular" },
  { id: "c3", serverId: "s1", type: "voice", name: "Ses Kanalı" },
  { id: "c4", serverId: "s1", type: "video", name: "Standup" },
];

export function ChatProvider({ children }) {
  const [activeServerId, setActiveServerId] = useState("s1");
  const [activeChannelId, setActiveChannelId] = useState("c1");

  const [messages, setMessages] = useState([
    { id: "m1", author: "Ada", content: "Hoş geldin! 👋", ts: Date.now()-60000 },
    { id: "m2", author: "Es", content: "UI’ı turuncuya boyadım 🍊", ts: Date.now()-30000 },
  ]);

  const value = useMemo(
    () => ({
      servers: sampleServers,
      channels: sampleChannels.filter(c => c.serverId === activeServerId),
      activeServerId, setActiveServerId,
      activeChannelId, setActiveChannelId,
      messages, setMessages,
    }),
    [activeServerId, activeChannelId, messages]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
