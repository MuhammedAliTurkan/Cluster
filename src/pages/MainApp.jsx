// src/pages/MainApp.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import SidebarServers from "../components/sidebar/SidebarServers";
import SidebarChannels from "../components/sidebar/SidebarChannels";
import SidebarDM from "../components/sidebar/SidebarDM"; // ← isim sabitle
import Navbar from "../components/navbar/Navbar";
import UserSideBar from "../components/users/UserSideBar";

import Friends from "./Friends";
import DMPage from "./DMPage";
import ChatWindow from "../components/chat/ChatWindow";
import VoiceChannel from "../components/voice/VoiceChannel";
import VideoCall from "../components/video/VideoCall";
import Discover from "./Discover";

import { useChat } from "../context/ChatContext";

/**
 * Not: DM’yi ayrı route’a taşıyoruz: /app/dm/:channelId
 * Arkadaş listesi:                    /app/friends
 */
export default function MainApp() {
  const { activeServerId } = useChat();
  const loc = useLocation();

  // DM alanını sağlam yakala: /app/friends ... veya /app/dm/...
  const isInFriends = /\/app\/friends(\/|$)/.test(loc.pathname);
  const isInDm      = /\/app\/dm(\/|$)/.test(loc.pathname);
  const isDMArea    = isInFriends || isInDm;

  const isDiscover  = /\/app\/discover(\/|$)/.test(loc.pathname);
  const collapsedChannels = !activeServerId;

  return (
    <div className="h-screen w-screen bg-[#1C1C1C] text-white flex">
      {/* SOL: sunucu ikon sütunu */}
      <SidebarServers />

      {/* SOL-ORTA: DM sidebar ya da sunucu kanalları */}
      {!isDiscover && (isDMArea ? (
        <SidebarDM />
      ) : (
        <SidebarChannels collapsed={collapsedChannels} />
      ))}

      {/* ORTA: içerik */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar /> {/* başlığı dinamik yapacağız */}
        <div className="flex-1 min-h-0">
          <Routes>
            <Route index element={<Navigate to="friends" replace />} />
            <Route path="friends" element={<Friends />} />
            <Route path="dm/:channelId" element={<DMPage />} />
            <Route path="chat" element={<ChatWindow />} />
            <Route path="voice/:channelId" element={<VoiceChannel />} />
            <Route path="video/:roomId" element={<VideoCall />} />
            <Route path="discover" element={<Discover />} />
            <Route path="*" element={<Navigate to="friends" replace />} />
          </Routes>
        </div>
      </div>

      {/* SAĞ: kullanıcı paneli sadece sunucu context'inde */}
      {!isDMArea && !isDiscover && activeServerId && <UserSideBar />}
    </div>
  );
}
