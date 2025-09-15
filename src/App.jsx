import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/navbar/Navbar";
import SidebarServers from "./components/sidebar/SidebarServers";
import SidebarChannels from "./components/sidebar/SidebarChannels";
import UserSideBar from "./components/users/UserSideBar";
import ChatWindow from "./components/chat/ChatWindow";
import VoiceChannel from "./components/voice/VoiceChannel";
import VideoCall from "./components/video/VideoCall";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { ModalProvider } from "./context/ModalContext";
import CreateServerModal from "./components/modals/CreateServerModal";
import CreateChannelModal from "./components/modals/CreateChannelModal";

function Shell() {
  const loc = useLocation();
  const isSettings = loc.pathname.startsWith("/settings");

  // SETTINGS tam ekran: hiçbir yan panel veya navbar yok
  if (isSettings) {
    return (
      <div className="h-screen w-screen bg-[#1C1C1C] text-white">
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </div>
    );
  }

  // Normal uygulama kabuğu
  return (
    <div className="h-screen w-screen bg-[#1C1C1C] text-white flex">
      <SidebarServers />
      <SidebarChannels />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/app" element={<Dashboard />}>
              <Route index element={<ChatWindow />} />
              <Route path="voice/:channelId" element={<VoiceChannel />} />
              <Route path="video/:roomId" element={<VideoCall />} />
            </Route>

            <Route path="/friends/*" element={<Friends />} />
          </Routes>
        </div>
      </div>
      <UserSideBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <ModalProvider>
            <Shell />
            {/* Modals: app genelinde görünür */}
            <CreateServerModal />
            <CreateChannelModal />
          </ModalProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
