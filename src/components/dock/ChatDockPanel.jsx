import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import dmApi from "../../services/dmApi";
import ChatWindow from "../chat/ChatWindow";
import ServerPostsView from "../posts/ServerPostsView";
import TopicChannelView from "../chat/TopicChannelView";
import { useBgMusic } from "../../hooks/useBgMusic";

export default function ChatDockPanel() {
  const { activeServerId, activeChannelId, serverData: ctxServerData, channels: ctxChannels } = useChat();
  const { user } = useAuth();
  const loc = useLocation();

  const dmMatch = loc.pathname.match(/\/app\/dm\/([^/]+)/);
  const dmChannelId = dmMatch?.[1];

  // Arkadaşlar listesinden açılan DM (route değiştirmeden)
  const [manualDmId, setManualDmId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.channelId;
      if (id) setManualDmId(id);
    };
    window.addEventListener("open-dm-chat", handler);
    return () => window.removeEventListener("open-dm-chat", handler);
  }, []);

  // Route değişince manual DM'i temizle (kullanıcı başka yere gitti)
  useEffect(() => {
    setManualDmId(null);
  }, [loc.pathname]);

  const isDMArea = /\/app\/(friends|dm)(\/|$)/.test(loc.pathname);
  const isServerArea = !isDMArea && !!activeServerId;

  let channelId = null;
  let isDM = false;

  if (dmChannelId) {
    channelId = dmChannelId;
    isDM = true;
  } else if (manualDmId && isDMArea) {
    // Arkadaşlar listesinden açılmış DM
    channelId = manualDmId;
    isDM = true;
  } else if (isServerArea && activeChannelId) {
    channelId = activeChannelId;
    isDM = false;
  }

  const [channelInfo, setChannelInfo] = useState(null);
  const serverData = ctxServerData;

  useEffect(() => {
    if (!channelId) { setChannelInfo(null); return; }

    if (isDM) {
      // DM kanalları context'te yok, API'den çek
      dmApi.getChannel(channelId).then((ch) => {
        const meKeys = new Set(
          [user?.id, user?.username].filter(Boolean).map(x => String(x).toLowerCase())
        );
        const other = (ch?.participants || []).find(p => {
          const keys = [p?.id, p?.username].filter(Boolean).map(x => String(x).toLowerCase());
          return !keys.some(k => meKeys.has(k));
        }) || ch?.participants?.[0];
        setChannelInfo({
          type: "dm",
          name: other?.displayName || other?.username || ch?.title || "DM",
          avatarUrl: other?.avatarUrl,
        });
      }).catch(() => setChannelInfo(null));
    } else {
      // Sunucu kanalı — context'ten oku, API çağrısı yok
      const ch = ctxChannels?.find(c => c.id === channelId);
      setChannelInfo({
        type: "channel",
        channelType: ch?.type || "TEXT",
        name: ch?.title || ch?.name || "kanal",
        serverName: ctxServerData?.name || "Sunucu",
        serverIcon: ctxServerData?.iconUrl,
        bgMusicUrl: ch?.bgMusicUrl || null,
        botOnly: ch?.botOnly || false,
      });
    }
  }, [channelId, isDM, ctxChannels, ctxServerData, user?.id]);

  // POST kanalında arka plan müziğini durdur (hook her zaman çağrılmalı)
  const isPostChannel = channelInfo?.channelType === "POST";
  useBgMusic(!channelId || isPostChannel ? null : channelInfo?.bgMusicUrl || null);

  if (!channelId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        {isDMArea ? "Bir sohbet seçin" : "Bir kanal seçin"}
      </div>
    );
  }

  // POST kanalı → gönderi görünümü
  if (isPostChannel && activeServerId) {
    return <ServerPostsView serverId={activeServerId} channelTitle={channelInfo.name} />;
  }

  // THREAD kanalı → konu (forum) görünümü
  if (channelInfo?.channelType === "THREAD" && !isDM) {
    return <TopicChannelView channelId={channelId} channelTitle={channelInfo.name} serverData={serverData} />;
  }

  return <ChatWindow channelId={channelId} isDM={isDM} channelInfo={channelInfo} serverData={serverData} />;
}
