import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../common/Avatar";
import ProfileModal from "../modals/ProfileModal";

export default function UserTray() {
  const { user } = useAuth();
  const media = useMedia();
  const { activeServerId, setActiveChannelId, lastVisitedByServer } = useChat();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const display = user?.displayName || user?.username || "Kullanıcı";
  const handle = user?.username ? `@${user.username}` : "";

  const toggleMute = () => {
    if (!media.inCall) return;
    media.toggleMic();
  };

  const toggleDeafen = () => {
    if (!media.inCall) return;
    media.toggleDeafen();
  };

  const handleLeave = () => {
    media.leaveCall();
    // Son text kanalına geri dön
    const lastTextCh = activeServerId && lastVisitedByServer[activeServerId];
    if (lastTextCh) setActiveChannelId(lastTextCh);
    navigate("/app/chat", { replace: true });
  };

  return (
    <>
      <div className="bg-[#0b1118] border-t border-white/5 px-2 py-2">
        {/* Çağrı bilgisi — sesli sohbetteyken göster */}
        {media.inCall && (
          <div className="flex items-center gap-2 px-1 py-1.5 mb-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] text-emerald-400 font-medium flex-1 truncate">Ses Bağlantısı</span>
            <button
              onClick={handleLeave}
              className="px-2 py-0.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-medium transition shrink-0"
              title="Ses kanalından ayrıl"
            >
              Ayrıl
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setProfileOpen(true)} className="relative group" title="Profili düzenle">
            <Avatar src={user?.avatarUrl} name={display} size={36} />
            <span className={`absolute -bottom-0 -right-0 w-3 h-3 rounded-full ring-2 ring-[#0b1118] ${
              media.inCall ? "bg-emerald-400" : "bg-gray-500"
            }`} />
          </button>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setProfileOpen(true)}>
            <div className="text-[13px] font-medium truncate">{display}</div>
            <div className="text-[11px] text-gray-400 truncate">{handle}</div>
          </div>

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

            {/* Kulaklık */}
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

          </div>
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
