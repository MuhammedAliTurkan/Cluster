import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import unreadApi from "../services/unreadApi";
import { serverApi } from "../services/serverApi";
import { subscribeTopic, onReconnect } from "../services/ws";
import { sounds } from "../utils/sounds";
import { useAuth } from "./AuthContext";

const UnreadContext = createContext(null);

export function UnreadProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({});
  const [serverCounts, setServerCounts] = useState({});
  const activeChannelRef = useRef(null);

  // Tum sunucularin kanallari: { channelId: { title, serverId, serverName } }
  const [allChannels, setAllChannels] = useState({});

  // Ilk yuklemede tum sunucularin kanallarini cek
  const fetchAllChannels = useCallback(async () => {
    try {
      const servers = await serverApi.myServers();
      const map = {};
      await Promise.all((servers || []).map(async (srv) => {
        try {
          const chs = await serverApi.channels(srv.id);
          (chs || []).forEach((ch) => {
            map[ch.id] = { title: ch.title, type: ch.type, serverId: srv.id, serverName: srv.name };
          });
        } catch {}
      }));
      setAllChannels(map);
    } catch {}
  }, []);

  // Ilk yuklemede + reconnect'te
  const fetchSummary = useCallback(async () => {
    try {
      const data = await unreadApi.getSummary();
      setCounts(data?.channels || {});
      setServerCounts(data?.servers || {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSummary();
    fetchAllChannels();
    const unsub = onReconnect(() => { fetchSummary(); fetchAllChannels(); });
    return () => unsub();
  }, [user, fetchSummary, fetchAllChannels]);

  // Sunucu listesi degisince kanallari yeniden cek
  useEffect(() => {
    const handler = () => fetchAllChannels();
    window.addEventListener("servers-updated", handler);
    return () => window.removeEventListener("servers-updated", handler);
  }, [fetchAllChannels]);

  // Browser notification izni
  useEffect(() => {
    if (user && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // TUM kanallari STOMP ile dinle
  const channelIdsKey = Object.keys(allChannels).sort().join(",");
  useEffect(() => {
    if (!user || !channelIdsKey) return;

    const entries = Object.entries(allChannels).filter(([, info]) =>
      info.type === "TEXT" || info.type === "GUILD" || info.type === "THREAD" || info.type === "POST"
    );

    const unsubs = entries.map(([chId, info]) =>
      subscribeTopic(`/topic/channels/${chId}`, (msg) => {
        if (!msg?.id) return;
        if (msg.type === "TYPING" || msg.type === "REACTION_UPDATE" || msg.type === "PIN_UPDATE"
          || msg.type === "THREAD_CREATED" || msg.type === "THREAD_UPDATE") return;
        if (msg.deleted) return;

        const senderId = msg.sender?.id || msg.senderId;
        if (senderId === user.id) return;
        if (chId === activeChannelRef.current && document.hasFocus()) return;

        setCounts((prev) => ({ ...prev, [chId]: (prev[chId] || 0) + 1 }));
        if (info.serverId) {
          setServerCounts((prev) => ({ ...prev, [info.serverId]: (prev[info.serverId] || 0) + 1 }));
        }

        // Bildirim sesi
        try {
          const settings = JSON.parse(localStorage.getItem("cl-userSettings") || "{}");
          if (settings.notificationSounds !== false) sounds.message();
        } catch { sounds.message(); }

        // Browser notification
        if (!document.hasFocus() && "Notification" in window && Notification.permission === "granted") {
          try {
            const senderName = msg.sender?.displayName || msg.sender?.username || "Birisi";
            const where = info.serverName ? `#${info.title} — ${info.serverName}` : info.title || "Kanal";
            const preview = msg.content?.substring(0, 100) || "Yeni mesaj";
            const notif = new Notification(where, {
              body: `${senderName}: ${preview}`,
              icon: "/favicon.ico",
              tag: `cluster-${chId}`,
              silent: true,
            });
            notif.onclick = () => { window.focus(); notif.close(); };
            setTimeout(() => notif.close(), 5000);
          } catch {}
        }
      })
    );

    return () => unsubs.forEach((u) => u?.());
  }, [channelIdsKey, user?.id]);

  // Okundu isaretle
  const markRead = useCallback(async (channelId, lastReadMessageId, serverId) => {
    if (!channelId || !lastReadMessageId) return;
    try {
      await unreadApi.markRead(channelId, lastReadMessageId);
      setCounts((prev) => {
        const copy = { ...prev };
        const was = copy[channelId] || 0;
        delete copy[channelId];
        if (serverId && was > 0) {
          setServerCounts((sp) => {
            const sc = { ...sp, [serverId]: Math.max(0, (sp[serverId] || 0) - was) };
            if (sc[serverId] <= 0) delete sc[serverId];
            return sc;
          });
        }
        return copy;
      });
    } catch {}
  }, []);

  const setActiveChannel = useCallback((channelId) => {
    activeChannelRef.current = channelId;
  }, []);

  const getUnread = useCallback((channelId) => counts[channelId] || 0, [counts]);
  const getServerUnread = useCallback((serverId) => serverCounts[serverId] || 0, [serverCounts]);
  const handleNewMessage = useCallback(() => {}, []);

  const value = {
    counts, fetchSummary, markRead, setActiveChannel,
    getUnread, getServerUnread, handleNewMessage,
  };

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used within <UnreadProvider>");
  return ctx;
}
