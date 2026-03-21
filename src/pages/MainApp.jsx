import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import SidebarServers from "../components/sidebar/SidebarServers";
import SidebarChannels from "../components/sidebar/SidebarChannels";
import SidebarDM from "../components/sidebar/SidebarDM";
import Navbar from "../components/navbar/Navbar";
import UserSideBar from "../components/users/UserSideBar";
import UserTray from "../components/users/UserTray";
import MobileDrawer from "../components/layout/MobileDrawer";
import PanelLayout from "../components/layout/PanelLayout";

import Friends from "./Friends";
import DMPage from "./DMPage";
import ChatWindow from "../components/chat/ChatWindow";
import VoiceChannel from "../components/voice/VoiceChannel";
import VideoCall from "../components/video/VideoCall";
import PersistentVoice from "../components/voice/PersistentVoice";
import Discover from "./Discover";
import BotDiscovery from "./BotDiscovery";
import BotProfile from "./BotProfile";
import BotDeveloper from "./BotDeveloper";
import PostFeedPage from "./PostFeedPage";
import ServerPostsView from "../components/posts/ServerPostsView";
import TopicChannelView from "../components/chat/TopicChannelView";
import ServerSettings from "./ServerSettings";
import UserSettings from "./UserSettings";

import VoiceDockPanel from "../components/dock/VoiceDockPanel";
import ChatDockPanel from "../components/dock/ChatDockPanel";
import VoiceReconnectBanner from "../components/voice/VoiceReconnectBanner";

import { useChat } from "../context/ChatContext";
import { useCall } from "../context/CallContext";
import { useMedia } from "../context/MediaContext";
import { useModals } from "../context/ModalContext";
import { useLayoutStore } from "../hooks/useLayoutStore";
import { useKeybinds } from "../hooks/useKeybinds";
import IncomingCallModal from "../components/calls/IncomingCallModal";
import OutgoingCallModal from "../components/calls/OutgoingCallModal";
import ServerHubModal from "../components/modals/SeverHubModal";

/* ── Boş alan ── */
const HATCH_STYLE = {
  backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)",
};

/* ── Sunucu chat placeholder ── */
function ServerChatPage() {
  const { activeServerId, setActiveServerId, activeChannelId, serverData, channels } = useChat();

  useEffect(() => {
    if (!activeServerId) {
      const last = localStorage.getItem("cl-lastServerId");
      if (last) setActiveServerId(last);
    }
  }, [activeServerId, setActiveServerId]);

  if (!activeChannelId)
    return <div className="flex items-center justify-center h-full text-gray-500">Bir kanal seçin</div>;

  // Kanal bilgisini context'teki channels listesinden bul
  const activeChannel = channels.find((ch) => ch.id === activeChannelId);
  const chType = activeChannel?.type;

  // POST kanalı → gönderi görünümü
  if (chType === "POST" && activeServerId) {
    return <ServerPostsView serverId={activeServerId} channelTitle={activeChannel.title} />;
  }

  // THREAD kanalı (bağımsız, forum) → konu görünümü
  if (chType === "THREAD") {
    return <TopicChannelView channelId={activeChannelId} channelTitle={activeChannel.title} serverData={serverData} />;
  }

  return <ChatWindow channelId={activeChannelId} serverData={serverData} />;
}

/* ── Route tanımları ── */
function AppRoutes({ onNavigateSide }) {
  const { activeServerId } = useChat();
  const defaultRoute = activeServerId ? "chat" : "friends";
  return (
    <Routes>
      <Route index element={<Navigate to={defaultRoute} replace />} />
      <Route path="friends" element={<Friends onNavigateSide={onNavigateSide} />} />
      <Route path="dm/:channelId" element={<DMPage />} />
      <Route path="chat" element={<ServerChatPage />} />
      <Route path="voice/:channelId" element={<VoiceChannel />} />
      <Route path="video/:roomId" element={<VideoCall />} />
      <Route path="discover" element={<Discover />} />
      <Route path="bots" element={<BotDiscovery />} />
      <Route path="bot/:botId" element={<BotProfile />} />
      <Route path="developer" element={<BotDeveloper />} />
      <Route path="posts" element={<PostFeedPage />} />
      <Route path="server-settings" element={<ServerSettings />} />
      <Route path="user-settings" element={<UserSettings />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

/* ══════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════ */
export default function MainApp() {
  useKeybinds();
  const { activeServerId } = useChat();
  const { incoming, outgoing, accept, decline, cancelOutgoing } = useCall();
  const media = useMedia();
  const { serverHubOpen, serverHubTab, closeServerHub } = useModals();
  const loc = useLocation();

  const isInFriends = /\/app\/friends(\/|$)/.test(loc.pathname);
  const isInDm = /\/app\/dm(\/|$)/.test(loc.pathname);
  const isInVoice = /\/app\/voice(\/|$)/.test(loc.pathname);
  const isInVideo = /\/app\/video(\/|$)/.test(loc.pathname);
  const isDMArea = isInFriends || isInDm || ((isInVoice || isInVideo) && media.voiceSource === "dm");
  const isDiscover = /\/app\/discover(\/|$)/.test(loc.pathname);
  const isBotPages = /\/app\/(bot(s|\/)|developer)(\/|$)/.test(loc.pathname);
  const isPostPages = /\/app\/posts(\/|$)/.test(loc.pathname);
  const isServerSettings = /\/app\/server-settings(\/|$)/.test(loc.pathname);
  const isUserSettings = /\/app\/user-settings(\/|$)/.test(loc.pathname);

  /* ── Layout ── */
  const {
    layout, shows, togglePanel, swapSides, reorderCenter,
    setLeftWidth, setRightWidth, setCenterSplit,
  } = useLayoutStore(media.inCall);

  // Voice dock container
  const [voiceDockNode, setVoiceDockNode] = useState(null);


  // Mobil
  const [leftOpen, setLeftOpen] = useState(false);
  const [midOpen, setMidOpen] = useState(false);

  /* ── Side panel renderer ── */
  const renderSidePanel = useCallback((panelId) => {
    if (panelId === "sidebar") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            {isDMArea ? <SidebarDM /> : <SidebarChannels collapsed={!activeServerId} />}
          </div>
          <UserTray />
        </div>
      );
    }
    if (panelId === "members") {
      return isDMArea
        ? <Friends onNavigateSide={() => setMidOpen(true)} />
        : <UserSideBar />;
    }
    return null;
  }, [isDMArea, activeServerId]);

  /* ── Center panel renderer ── */
  const renderCenterPanel = useCallback((panelId) => {
    if (panelId === "chat") return <ChatDockPanel />;
    if (panelId === "voice") return <VoiceDockPanel onNodeReady={setVoiceDockNode} />;
    return null;
  }, []);

  /* ── Empty center ── */
  const emptyCenter = (
    <div className="h-full w-full flex items-center justify-center bg-surface-2" style={HATCH_STYLE} />
  );

  return (
    <div className="h-screen w-screen bg-surface-2 text-white flex overflow-hidden">
      {/* Sunucu ikon sütunu */}
      <div className="hidden md:flex shrink-0">
        <SidebarServers />
      </div>

      {/* Mobil drawer'lar */}
      <MobileDrawer open={leftOpen} onClose={() => setLeftOpen(false)} side="left" width={80}>
        <SidebarServers />
      </MobileDrawer>
      {!isDiscover && (
        <MobileDrawer open={midOpen} onClose={() => setMidOpen(false)} side="left" width={288}>
          {isDMArea ? <SidebarDM /> : <SidebarChannels collapsed={!activeServerId} />}
        </MobileDrawer>
      )}

      {/* Ana alan */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenServers={() => setLeftOpen(true)}
          onOpenSecondary={() => setMidOpen(true)}
          isDMArea={isDMArea}
          shows={shows}
          toggles={{
            sidebar: () => togglePanel("sidebar"),
            members: () => togglePanel("members"),
            voice: () => togglePanel("voice"),
            chat: () => togglePanel("chat"),
          }}
          mediaInCall={media.inCall}
        />

        {/* Masaüstü */}
        <div className="flex-1 min-h-0 hidden md:block overflow-hidden">
          {isDiscover || isBotPages || isPostPages || isServerSettings || isUserSettings ? (
            <div className="h-full w-full overflow-hidden">
              <AppRoutes onNavigateSide={() => setMidOpen(true)} />
            </div>
          ) : (
            <PanelLayout
              layout={layout}
              shows={shows}
              togglePanel={togglePanel}
              setLeftWidth={setLeftWidth}
              setRightWidth={setRightWidth}
              setCenterSplit={setCenterSplit}
              swapSides={swapSides}
              reorderCenter={reorderCenter}
              renderSidePanel={renderSidePanel}
              renderCenterPanel={renderCenterPanel}
              emptyCenter={emptyCenter}
              centerLabels={undefined}
              isDMArea={isDMArea}
            />
          )}
        </div>

        {/* Mobil */}
        <div className="flex-1 min-h-0 md:hidden relative">
          <AppRoutes onNavigateSide={() => setMidOpen(true)} />
        </div>

        {/* Ses bağlantısı */}
        <PersistentVoice docked={shows.voice} containerNode={voiceDockNode} />
      </div>

      {/* Modaller */}
      <IncomingCallModal
        open={!!incoming} invite={incoming}
        onClose={() => decline(incoming)} onDecline={() => decline(incoming)} onAccept={() => accept(incoming)}
      />
      <OutgoingCallModal open={!!outgoing} data={outgoing} onClose={cancelOutgoing} />
      <ServerHubModal
        open={serverHubOpen} onClose={closeServerHub} initialTab={serverHubTab}
        onCreated={() => window.dispatchEvent(new Event("servers-updated"))}
      />
      <VoiceReconnectBanner />
    </div>
  );
}
