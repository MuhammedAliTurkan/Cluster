import { useEffect, useRef, useState } from "react";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import { api } from "../../context/AuthContext";
import Avatar from "../common/Avatar";

export default function ParticipantVolumeMenu({ identity, name, avatarUrl, position, isLocal, channelId: propChannelId, onClose }) {
  const media = useMedia();
  const { activeChannelId } = useChat();
  const ref = useRef(null);
  const volume = media.participantVolumes[identity] ?? 100;
  const [busy, setBusy] = useState(false);
  // Ses kanalı ID'si: prop olarak geldiyse onu kullan, yoksa MediaContext'teki channelId
  const voiceChannelId = propChannelId || media.channelId || media.voiceState?.channelId || activeChannelId;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const style = {
    position: "fixed",
    zIndex: 9999,
    left: Math.min(position.x, window.innerWidth - 260),
    top: Math.min(position.y, window.innerHeight - 340),
  };

  const handleVolumeChange = (e) => {
    media.setParticipantVolume(identity, Number(e.target.value));
  };

  const handleLocalMute = () => {
    media.setParticipantVolume(identity, volume === 0 ? 100 : 0);
  };

  const doAction = async (action) => {
    if (busy || !voiceChannelId) return;
    setBusy(true);
    try {
      if (action === "kick") {
        await api.post("/api/livekit/kick", { channelId: voiceChannelId, identity });
      } else if (action === "mute") {
        await api.post("/api/livekit/mute", { channelId: voiceChannelId, identity, muted: true, trackType: "AUDIO" });
      } else if (action === "muteVideo") {
        await api.post("/api/livekit/mute", { channelId: voiceChannelId, identity, muted: true, trackType: "VIDEO" });
      }
      onClose();
    } catch (e) {
      console.error("Action failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} style={style} className="w-60 bg-surface-2 border border-border-light rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <Avatar src={avatarUrl} name={name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">{name}</div>
          <div className="text-[10px] text-gray-500">{isLocal ? "Sen" : "Katılımcı"}</div>
        </div>
      </div>

      {/* Volume slider */}
      {!isLocal && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Ses Seviyesi</span>
            <span className="text-xs text-white font-medium">{volume}%</span>
          </div>
          <input
            type="range" min="0" max="200" value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 rounded-full appearance-none bg-surface-6 cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          />
          <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
            <span>0%</span>
            <span>200%</span>
          </div>
          <button
            onClick={handleLocalMute}
            className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition ${
              volume === 0
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {volume === 0 ? "Sesi Aç" : "Sustur (Yerel)"}
          </button>
        </div>
      )}

      {/* Moderation actions — only for other users */}
      {!isLocal && (
        <div className="px-2 py-2 space-y-0.5">
          <button
            onClick={() => doAction("mute")}
            disabled={busy}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-300 hover:bg-surface-4 hover:text-white transition disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
              <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mikrofonunu Kapat
          </button>
          <button
            onClick={() => doAction("muteVideo")}
            disabled={busy}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-300 hover:bg-surface-4 hover:text-white transition disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
              <path d="M1 1l22 22M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            Kamerasını Kapat
          </button>

          <div className="h-px bg-white/5 my-1" />

          <button
            onClick={() => doAction("kick")}
            disabled={busy}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" strokeLinecap="round" />
              <line x1="23" y1="8" x2="18" y2="13" strokeLinecap="round" />
            </svg>
            Odadan At
          </button>
        </div>
      )}

      {isLocal && (
        <div className="px-4 py-3 text-xs text-gray-500 text-center">
          Kendi ses seviyenizi değiştiremezsiniz
        </div>
      )}
    </div>
  );
}
