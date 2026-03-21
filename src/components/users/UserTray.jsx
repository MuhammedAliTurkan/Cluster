import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import { usePresence, STATUS_OPTIONS } from "../../context/PresenceContext";
import Avatar from "../common/Avatar";
import ProfileModal from "../modals/ProfileModal";
import UserProfilePopup from "./UserProfilePopup";
import { paths } from "../../routes/paths";

export default function UserTray() {
  const { user } = useAuth();
  const media = useMedia();
  const { activeServerId, setActiveChannelId, lastVisitedByServer } = useChat();
  const { myStatus, changeStatus } = usePresence();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [hoverPopup, setHoverPopup] = useState(false);
  const dropdownRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const trayRef = useRef(null);
  const display = user?.displayName || user?.username || "Kullanıcı";
  const handle = user?.username ? `@${user.username}` : "";

  // Disari tiklayinca durum dropdown'u kapat
  useEffect(() => {
    if (!statusOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusOpen]);

  // Hover popup logic
  const handleMouseEnter = useCallback(() => {
    if (statusOpen || profileOpen) return;
    hoverTimerRef.current = setTimeout(() => setHoverPopup(true), 400);
  }, [statusOpen, profileOpen]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current);
    setHoverPopup(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(hoverTimerRef.current);
  }, []);

  // Herhangi bir modal acilinca hover'i kapat
  useEffect(() => {
    if (statusOpen || profileOpen) {
      setHoverPopup(false);
      clearTimeout(hoverTimerRef.current);
    }
  }, [statusOpen, profileOpen]);

  const toggleMute = () => {
    if (!media.inCall) return;
    media.toggleMic();
  };

  const toggleDeafen = () => {
    if (!media.inCall) return;
    media.toggleDeafen();
  };

  const handleLeave = () => {
    const source = media.voiceSource;
    media.leaveCall();
    if (source === "dm") {
      navigate("/app/friends", { replace: true });
    } else {
      const lastTextCh = activeServerId && lastVisitedByServer[activeServerId];
      if (lastTextCh) setActiveChannelId(lastTextCh);
      navigate("/app/chat", { replace: true });
    }
  };

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === myStatus)?.label || "Çevrimiçi";

  return (
    <>
      <div
        className="bg-surface-0 border-t border-white/5 px-2 py-2 relative"
        ref={trayRef}
      >
        {/* Hover popup */}
        {hoverPopup && !statusOpen && (
          <div className="absolute bottom-full left-1 mb-2 z-50">
            <UserProfilePopup user={user} />
          </div>
        )}

        {/* Cagri bilgisi + ping — hover tetiklemez */}
        {media.inCall && (
          <div className="px-1 py-1.5 mb-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] text-emerald-400 font-medium flex-1 truncate">
                {media.connectionInfo?.state === "connecting" ? "Bağlanıyor..." :
                 media.connectionInfo?.state === "reconnecting" ? "Yeniden bağlanıyor..." :
                 "Ses Bağlantısı"}
              </span>
              {media.connectionInfo?.state === "connected" && (
                <PingIndicator ping={media.connectionInfo?.ping} />
              )}
              <button
                onClick={handleLeave}
                className="px-2 py-0.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-medium transition shrink-0"
                title="Ses kanalından ayrıl"
              >
                Ayrıl
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar + isim: sadece bu alan hover popup tetikler */}
          <div
            className="flex items-center gap-2 min-w-0 flex-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Avatar + durum secici */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setStatusOpen((p) => !p)}
                className="relative group"
                title="Durumu değiştir"
              >
                <Avatar src={user?.avatarUrl} name={display} size={36} status={myStatus} />
              </button>

            {/* Durum dropdown */}
            {statusOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-surface-2 rounded-lg border border-border shadow-xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wide">Durum</div>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      changeStatus(opt.value);
                      setStatusOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center gap-2.5 hover:bg-surface-3 transition text-left ${
                      myStatus === opt.value ? "bg-surface-3" : ""
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${opt.color} shrink-0`} />
                    <span className="text-sm text-gray-200">{opt.label}</span>
                    {myStatus === opt.value && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 ml-auto text-green-400">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Isim + durum label */}
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setProfileOpen(true)}>
            <div className="text-[13px] font-medium truncate">{display}</div>
            <div className="text-[11px] text-gray-400 truncate">{statusLabel}</div>
          </div>
          </div>{/* hover alanı sonu */}

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Mikrofon */}
            <button
              onClick={toggleMute}
              disabled={!media.inCall}
              className={`w-8 h-8 rounded-lg grid place-items-center transition ${
                !media.inCall
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : !media.micEnabled
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
              title={!media.inCall ? "Çağrıda değilsiniz" : media.micEnabled ? "Mikrofonu kapat" : "Mikrofonu aç"}
            >
              {!media.micEnabled && media.inCall ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12m14 0a7 7 0 0 1-.11 1.23" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M12 19v4m-4 0h8" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <rect x="9" y="1" width="6" height="11" rx="3" strokeWidth="1.6"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M12 19v4m-4 0h8" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {/* Kulaklik */}
            <button
              onClick={toggleDeafen}
              disabled={!media.inCall}
              className={`w-8 h-8 rounded-lg grid place-items-center transition ${
                !media.inCall
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : media.deafened
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
              title={!media.inCall ? "Çağrıda değilsiniz" : media.deafened ? "Sesi aç" : "Sesi kapat"}
            >
              {media.deafened && media.inCall ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7z" strokeWidth="1.6"/>
                  <path d="M21 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-7z" strokeWidth="1.6"/>
                  <path d="M3 14v-2a9 9 0 0 1 15.66-6.08" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M21 14v-2c0-.34-.02-.67-.05-1" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7z" strokeWidth="1.6"/>
                  <path d="M21 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-7z" strokeWidth="1.6"/>
                  <path d="M3 14v-2a9 9 0 1 1 18 0v2" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {/* Ayarlar butonu */}
            <button
              onClick={() => navigate(paths.userSettings)}
              className="w-8 h-8 rounded-lg grid place-items-center bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
              title="Kullanıcı Ayarları"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

/** Sinyal gücü ikonu + ping ms gösterimi */
function PingIndicator({ ping }) {
  if (ping == null) return null;

  // Renk ve çubuk sayısı: yeşil (<80), sarı (<150), turuncu (<250), kırmızı (250+)
  let color, bars, label;
  if (ping < 80) {
    color = "#22c55e"; bars = 4; label = "Mükemmel";
  } else if (ping < 150) {
    color = "#eab308"; bars = 3; label = "İyi";
  } else if (ping < 250) {
    color = "#f97316"; bars = 2; label = "Orta";
  } else {
    color = "#ef4444"; bars = 1; label = "Zayıf";
  }

  return (
    <div className="flex items-center gap-1.5 mt-1 px-0.5" title={`${label} — ${ping} ms`}>
      {/* Sinyal çubukları */}
      <svg width="14" height="10" viewBox="0 0 14 10">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 3.5}
            y={10 - (i + 1) * 2.5}
            width="2.5"
            height={(i + 1) * 2.5}
            rx="0.5"
            fill={i < bars ? color : "#4b5563"}
          />
        ))}
      </svg>
      <span className="text-[10px] font-mono" style={{ color }}>{ping} ms</span>
    </div>
  );
}
