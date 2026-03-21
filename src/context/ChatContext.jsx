import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { serverApi } from "../services/serverApi";
import { subscribeTopic } from "../services/ws";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [activeServerId, setActiveServerId] = useState(
    () => localStorage.getItem("cl-activeServerId") || null
  );
  const [activeChannelId, setActiveChannelId] = useState(
    () => localStorage.getItem("cl-activeChannelId") || null
  );

  // Sunucu bazlı son ziyaret edilen kanal
  const [lastVisitedByServer, setLastVisitedByServer] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lastVisitedByServer") || "{}"); } catch { return {}; }
  });

  // Merkezi sunucu verileri — tek seferde çekilir, tüm componentler buradan okur
  const [serverData, setServerData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    localStorage.setItem("lastVisitedByServer", JSON.stringify(lastVisitedByServer));
  }, [lastVisitedByServer]);

  useEffect(() => {
    if (activeServerId) localStorage.setItem("cl-activeServerId", activeServerId);
    else localStorage.removeItem("cl-activeServerId");
  }, [activeServerId]);

  useEffect(() => {
    if (activeChannelId) localStorage.setItem("cl-activeChannelId", activeChannelId);
    else localStorage.removeItem("cl-activeChannelId");
  }, [activeChannelId]);

  // Sunucu değişince tek seferde tüm verileri çek
  const refreshServerData = useCallback(async () => {
    if (!activeServerId) { setServerData(null); setChannels([]); setMembers([]); return; }
    try {
      const [sv, chs, mems] = await Promise.all([
        serverApi.get(activeServerId),
        serverApi.channels(activeServerId),
        serverApi.members(activeServerId),
      ]);
      setServerData(sv);
      setChannels(chs || []);
      setMembers(mems || []);
    } catch (e) {
      console.error("Server data fetch error:", e);
    }
  }, [activeServerId]);

  useEffect(() => { refreshServerData(); }, [refreshServerData]);

  // Sadece kanalları yenile (kanal CRUD event'lerinde)
  const refreshChannels = useCallback(async () => {
    if (!activeServerId) return;
    try {
      const chs = await serverApi.channels(activeServerId);
      setChannels(chs || []);
    } catch {}
  }, [activeServerId]);

  // Sadece sunucu bilgisini yenile (settings event'lerinde)
  const refreshServer = useCallback(async () => {
    if (!activeServerId) return;
    try {
      const sv = await serverApi.get(activeServerId);
      setServerData(sv);
    } catch {}
  }, [activeServerId]);

  // Sadece üyeleri yenile
  const refreshMembers = useCallback(async () => {
    if (!activeServerId) return;
    try {
      const mems = await serverApi.members(activeServerId);
      setMembers(mems || []);
    } catch {}
  }, [activeServerId]);

  // WS: kanal CRUD event'leri
  useEffect(() => {
    if (!activeServerId) return;
    const unsub = subscribeTopic(`/topic/servers/${activeServerId}/channels`, () => refreshChannels());
    return () => unsub?.();
  }, [activeServerId, refreshChannels]);

  // WS: sunucu ayar değişiklikleri
  useEffect(() => {
    if (!activeServerId) return;
    const unsub = subscribeTopic(`/topic/servers/${activeServerId}/settings`, () => {
      refreshServer();
      window.dispatchEvent(new Event("servers-updated"));
    });
    return () => unsub?.();
  }, [activeServerId, refreshServer]);

  // WS: üye join/leave
  useEffect(() => {
    if (!activeServerId) return;
    const unsub = subscribeTopic(`/topic/servers/${activeServerId}/members`, () => refreshMembers());
    return () => unsub?.();
  }, [activeServerId, refreshMembers]);

  const value = useMemo(
    () => ({
      activeServerId, setActiveServerId,
      activeChannelId, setActiveChannelId,
      lastVisitedByServer, setLastVisitedByServer,
      serverData, channels, members,
      refreshServerData, refreshChannels, refreshServer, refreshMembers,
      setServerData, setChannels, setMembers,
    }),
    [activeServerId, activeChannelId, lastVisitedByServer, serverData, channels, members,
     refreshServerData, refreshChannels, refreshServer, refreshMembers]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
