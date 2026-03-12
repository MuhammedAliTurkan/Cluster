import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import SidebarServers from "../components/sidebar/SidebarServers";
import SidebarChannels from "../components/sidebar/SidebarChannels";
import SidebarDM from "../components/sidebar/SidebarDM";
import Navbar from "../components/navbar/Navbar";
import UserSideBar from "../components/users/UserSideBar";
import MobileDrawer from "../components/layout/MobileDrawer";

import Friends from "./Friends";
import DMPage from "./DMPage";
import ChatWindow from "../components/chat/ChatWindow";
import VoiceChannel from "../components/voice/VoiceChannel";
import VideoCall from "../components/video/VideoCall";
import PersistentVoice from "../components/voice/PersistentVoice";
import Discover from "./Discover";
import ServerSettings from "./ServerSettings";

import { useChat } from "../context/ChatContext";
import { useCall } from "../context/CallContext";
import { useModals } from "../context/ModalContext";
import IncomingCallModal from "../components/calls/IncomingCallModal";
import OutgoingCallModal from "../components/calls/OutgoingCallModal";
import ServerHubModal from "../components/modals/SeverHubModal";

/* ── Sunucu chat placeholder ── */
function ServerChatPage() {
  const { activeServerId, setActiveServerId, activeChannelId } = useChat();

  // Geri tuşu ile /app/chat'e dönüldüyse ve activeServerId null ise geri yükle
  useEffect(() => {
    if (!activeServerId) {
      const last = localStorage.getItem("cl-lastServerId");
      if (last) setActiveServerId(last);
    }
  }, [activeServerId, setActiveServerId]);

  if (!activeChannelId)
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Bir kanal seçin
      </div>
    );
  return <ChatWindow channelId={activeChannelId} />;
}

/* ── Yatay boyut sürükleme ── */
function HResizeHandle({ onDrag }) {
  const down = useRef(false);
  const onMouseDown = (e) => {
    e.preventDefault();
    down.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev) => down.current && onDrag(ev.clientX);
    const up = () => {
      down.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div onMouseDown={onMouseDown}
      className="w-[4px] shrink-0 cursor-col-resize bg-[#1a1a1a] hover:bg-orange-500/60 active:bg-orange-500 transition-colors" />
  );
}

/* ── Dikey boyut sürükleme ── */
function VResizeHandle({ onDrag }) {
  const down = useRef(false);
  const onMouseDown = (e) => {
    e.preventDefault();
    down.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    const move = (ev) => down.current && onDrag(ev.clientY);
    const up = () => {
      down.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div onMouseDown={onMouseDown}
      className="h-[4px] shrink-0 cursor-row-resize bg-[#1a1a1a] hover:bg-orange-500/60 active:bg-orange-500 transition-colors" />
  );
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
      <Route path="server-settings" element={<ServerSettings />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

/* ── localStorage ── */
function loadJson(key, fb) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function loadNum(key, fb) {
  try { const v = localStorage.getItem(key); return v ? Number(v) : fb; } catch { return fb; }
}

/* ── Grip ikonu ── */
function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3 h-3 mr-1.5 text-gray-500 shrink-0" fill="currentColor">
      <circle cx="4" cy="3" r="1.2"/><circle cx="4" cy="8" r="1.2"/><circle cx="4" cy="13" r="1.2"/>
      <circle cx="10" cy="3" r="1.2"/><circle cx="10" cy="8" r="1.2"/><circle cx="10" cy="13" r="1.2"/>
    </svg>
  );
}

/* ── Dock paneli (başlık + içerik) ── */
function DockPanel({ id, label, children, onDragStartPanel }) {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", id);
          e.dataTransfer.effectAllowed = "move";
          onDragStartPanel(id);
        }}
        className="h-7 shrink-0 flex items-center px-2 bg-[#17191c] cursor-grab active:cursor-grabbing select-none border-b border-[#2a2a2a]"
      >
        <GripIcon />
        <span className="text-[10px] uppercase tracking-wider text-gray-500 truncate">{label}</span>
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

/* ── Drop zone overlay ── */
const ZONE_STYLE = {
  left:   "left-0 top-0 w-16 h-full",
  right:  "right-0 top-0 w-16 h-full",
  top:    "top-0 left-0 h-16 w-full",
  bottom: "bottom-0 left-0 h-16 w-full",
};

function DropZones({ activeZone }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {["left", "right", "top", "bottom"].map((zone) => (
        <div
          key={zone}
          className={`absolute ${ZONE_STYLE[zone]} transition-colors duration-150 ${
            activeZone === zone ? "bg-orange-500/25 border-2 border-orange-500" : ""
          }`}
          style={{ borderStyle: activeZone === zone ? "solid" : "none" }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════ */
export default function MainApp() {
  const { activeServerId } = useChat();
  const { incoming, outgoing, accept, decline, cancelOutgoing } = useCall();
  const { serverHubOpen, serverHubTab, closeServerHub } = useModals();
  const loc = useLocation();

  const isInFriends = /\/app\/friends(\/|$)/.test(loc.pathname);
  const isInDm = /\/app\/dm(\/|$)/.test(loc.pathname);
  const isDMArea = isInFriends || isInDm;
  const isDiscover = /\/app\/discover(\/|$)/.test(loc.pathname);
  const isServerSettings = /\/app\/server-settings(\/|$)/.test(loc.pathname);

  // Panel görünürlük
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembers, setShowMembers] = useState(true);

  // Dock pozisyonları: "left" | "right" | "top" | "bottom"
  const [docks, setDocks] = useState(() =>
    loadJson("cl-docks", { sidebar: "left", members: "right" })
  );

  // Panel boyutları (px) — yatay dock için width, dikey dock için height
  const [sidebarSize, setSidebarSize] = useState(() => loadNum("cl-sidebar-size", 260));
  const [membersSize, setMembersSize] = useState(() => loadNum("cl-members-size", 240));

  const containerRef = useRef(null);

  // Drag state
  const [draggingPanel, setDraggingPanel] = useState(null);
  const [hoverZone, setHoverZone] = useState(null);

  // Kaydet
  useEffect(() => { localStorage.setItem("cl-docks", JSON.stringify(docks)); }, [docks]);
  useEffect(() => { localStorage.setItem("cl-sidebar-size", sidebarSize); }, [sidebarSize]);
  useEffect(() => { localStorage.setItem("cl-members-size", membersSize); }, [membersSize]);

  // Mobil
  const [leftOpen, setLeftOpen] = useState(false);
  const [midOpen, setMidOpen] = useState(false);

  const toggleSidebar = useCallback(() => setShowSidebar((v) => !v), []);
  const toggleMembers = useCallback(() => setShowMembers((v) => !v), []);

  const showMemberPanel = !isDMArea && !isDiscover && !isServerSettings && activeServerId && showMembers;
  const hasSidebar = !isDiscover && !isServerSettings && showSidebar;

  // Resize handlers
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

  const onSidebarResize = useCallback((val) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dock = docks.sidebar;
    let size;
    if (dock === "left") size = val - rect.left;
    else if (dock === "right") size = rect.right - val;
    else if (dock === "top") size = val - rect.top;
    else size = rect.bottom - val;
    const maxDim = (dock === "left" || dock === "right") ? rect.width * 0.6 : rect.height * 0.5;
    setSidebarSize(clamp(size, 140, maxDim));
  }, [docks.sidebar]);

  const onMembersResize = useCallback((val) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dock = docks.members;
    let size;
    if (dock === "left") size = val - rect.left;
    else if (dock === "right") size = rect.right - val;
    else if (dock === "top") size = val - rect.top;
    else size = rect.bottom - val;
    const maxDim = (dock === "left" || dock === "right") ? rect.width * 0.5 : rect.height * 0.5;
    setMembersSize(clamp(size, 140, maxDim));
  }, [docks.members]);

  // Drop: paneli yeni dock pozisyonuna taşı
  const handleDrop = useCallback((panelId, zone) => {
    if (!panelId || !zone) return;
    setDocks((prev) => {
      const next = { ...prev };
      // Eğer diğer panel zaten o zone'daysa, yerlerini değiştir
      const otherId = panelId === "sidebar" ? "members" : "sidebar";
      if (next[otherId] === zone) {
        next[otherId] = prev[panelId];
      }
      next[panelId] = zone;
      return next;
    });
    setDraggingPanel(null);
    setHoverZone(null);
  }, []);

  // Drag over — hangi zone'a yakın?
  const handleMainDragOver = useCallback((e) => {
    e.preventDefault();
    if (!draggingPanel) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    // Kenar mesafeleri
    const dLeft = x;
    const dRight = w - x;
    const dTop = y;
    const dBottom = h - y;
    const min = Math.min(dLeft, dRight, dTop, dBottom);
    const threshold = 80;

    if (min > threshold) { setHoverZone(null); return; }
    if (min === dLeft) setHoverZone("left");
    else if (min === dRight) setHoverZone("right");
    else if (min === dTop) setHoverZone("top");
    else setHoverZone("bottom");
  }, [draggingPanel]);

  const handleMainDrop = useCallback((e) => {
    e.preventDefault();
    const panelId = e.dataTransfer.getData("text/plain");
    if (panelId && hoverZone) handleDrop(panelId, hoverZone);
    setDraggingPanel(null);
    setHoverZone(null);
  }, [hoverZone, handleDrop]);

  // Panel render helper
  const renderDockContent = (panelId) => {
    if (panelId === "sidebar") {
      return (
        <DockPanel id="sidebar" label={isDMArea ? "Direkt Mesajlar" : "Kanallar"} onDragStartPanel={setDraggingPanel}>
          {isDMArea ? <SidebarDM /> : <SidebarChannels collapsed={!activeServerId} />}
        </DockPanel>
      );
    }
    return (
      <DockPanel id="members" label="Üyeler" onDragStartPanel={setDraggingPanel}>
        <UserSideBar />
      </DockPanel>
    );
  };

  const getSize = (panelId) => panelId === "sidebar" ? sidebarSize : membersSize;
  const getResizer = (panelId) => panelId === "sidebar" ? onSidebarResize : onMembersResize;
  const isHorizontal = (dock) => dock === "left" || dock === "right";

  const isVisible = (panelId) => {
    if (panelId === "sidebar") return hasSidebar;
    if (panelId === "members") return showMemberPanel;
    return false;
  };

  // Dock'lara göre panelleri grupla
  const leftPanels = ["sidebar", "members"].filter((p) => docks[p] === "left" && isVisible(p));
  const rightPanels = ["sidebar", "members"].filter((p) => docks[p] === "right" && isVisible(p));
  const topPanels = ["sidebar", "members"].filter((p) => docks[p] === "top" && isVisible(p));
  const bottomPanels = ["sidebar", "members"].filter((p) => docks[p] === "bottom" && isVisible(p));

  const renderSidePanel = (panelId, side) => {
    const size = getSize(panelId);
    const resizer = getResizer(panelId);
    return (
      <div key={panelId} className="flex h-full shrink-0">
        {side === "right" && <HResizeHandle onDrag={resizer} />}
        <div className="h-full overflow-hidden" style={{ width: size }}>
          {renderDockContent(panelId)}
        </div>
        {side === "left" && <HResizeHandle onDrag={resizer} />}
      </div>
    );
  };

  const renderVertPanel = (panelId, side) => {
    const size = getSize(panelId);
    const resizer = getResizer(panelId);
    return (
      <div key={panelId} className="flex flex-col w-full shrink-0">
        {side === "bottom" && <VResizeHandle onDrag={resizer} />}
        <div className="w-full overflow-hidden" style={{ height: size }}>
          {renderDockContent(panelId)}
        </div>
        {side === "top" && <VResizeHandle onDrag={resizer} />}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-[#1C1C1C] text-white flex overflow-hidden">
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
      <div
        ref={containerRef}
        className="flex-1 flex flex-col min-w-0 relative"
        onDragOver={handleMainDragOver}
        onDrop={handleMainDrop}
        onDragLeave={() => setHoverZone(null)}
      >
        <Navbar
          onOpenServers={() => setLeftOpen(true)}
          onOpenSecondary={() => setMidOpen(true)}
          isDMArea={isDMArea}
          onToggleSidebar={toggleSidebar}
          onToggleMembers={toggleMembers}
          showSidebar={showSidebar}
          showMembers={showMembers}
          showMemberToggle={!isDMArea && !isDiscover && !isServerSettings && !!activeServerId}
        />

        {/* Masaüstü layout */}
        <div className="flex-1 min-h-0 hidden md:flex flex-col relative">
          {/* Drop zone overlay */}
          {draggingPanel && <DropZones activeZone={hoverZone} />}

          {/* Üst dock */}
          {topPanels.map((p) => renderVertPanel(p, "top"))}

          {/* Orta satır: sol + content + sağ */}
          <div className="flex-1 min-h-0 flex">
            {/* Sol dock */}
            {leftPanels.map((p) => renderSidePanel(p, "left"))}

            {/* İçerik */}
            <div data-content-area className="flex-1 min-w-0 h-full overflow-hidden relative flex flex-col">
              <AppRoutes onNavigateSide={() => setMidOpen(true)} />
            </div>

            {/* Sağ dock */}
            {rightPanels.map((p) => renderSidePanel(p, "right"))}
          </div>

          {/* Alt dock */}
          {bottomPanels.map((p) => renderVertPanel(p, "bottom"))}
        </div>

        {/* Mobil içerik */}
        <div data-content-area className="flex-1 min-h-0 md:hidden relative">
          <AppRoutes onNavigateSide={() => setMidOpen(true)} />
        </div>

        {/* Ses bağlantısı — TEK İNSTANCE (desktop+mobil paylaşımlı) */}
        <PersistentVoice />
      </div>

      {/* Modaller */}
      <IncomingCallModal
        open={!!incoming}
        invite={incoming}
        onClose={() => decline(incoming)}
        onDecline={() => decline(incoming)}
        onAccept={() => accept(incoming)}
      />
      <OutgoingCallModal open={!!outgoing} data={outgoing} onClose={cancelOutgoing} />
      <ServerHubModal
        open={serverHubOpen}
        onClose={closeServerHub}
        initialTab={serverHubTab}
        onCreated={() => window.dispatchEvent(new Event("servers-updated"))}
      />
    </div>
  );
}
