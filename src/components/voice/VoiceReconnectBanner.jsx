import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import { fetchLiveKitToken } from "../../services/livekitApi";
import { paths } from "../../routes/paths";

const EXPIRE_MS = 60_000; // 60 saniye sonra bildirim kaybolur

export default function VoiceReconnectBanner() {
  const media = useMedia();
  const { setActiveChannelId } = useChat();
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(0);
  const [joining, setJoining] = useState(false);

  const room = media.disconnectedRoom;

  // Geri sayım
  useEffect(() => {
    if (!room) return;
    const calc = () => Math.max(0, EXPIRE_MS - (Date.now() - room.timestamp));
    setRemaining(calc());
    const interval = setInterval(() => {
      const r = calc();
      setRemaining(r);
      if (r <= 0) {
        media.setDisconnectedRoom(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room]);

  const dismiss = useCallback(() => {
    media.setDisconnectedRoom(null);
  }, [media]);

  const rejoin = useCallback(async () => {
    if (!room || joining) return;
    setJoining(true);
    try {
      const data = await fetchLiveKitToken(room.channelId, "audio");
      media.startVoice(data.token, data.wsUrl, room.channelId, room.source);
      setActiveChannelId(room.channelId);
      navigate(paths.voice(room.channelId) + `?channelId=${room.channelId}&mode=audio&source=${room.source || "server"}`, { replace: true });
      media.setDisconnectedRoom(null);
    } catch (err) {
      console.error("Voice rejoin failed:", err);
    } finally {
      setJoining(false);
    }
  }, [room, joining, media, navigate, setActiveChannelId]);

  if (!room || remaining <= 0) return null;

  const secs = Math.ceil(remaining / 1000);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-1 border border-border shadow-xl">
        {/* Ses ikonu */}
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="text-sm text-white">Ses bağlantısı kesildi</span>
          <span className="text-[11px] text-gray-400">{secs}s içinde kaybolacak</span>
        </div>

        <button
          onClick={rejoin}
          disabled={joining}
          className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-dark text-white text-sm font-medium transition disabled:opacity-60"
        >
          {joining ? "..." : "Odaya Dön"}
        </button>

        <button
          onClick={dismiss}
          className="p-1 rounded text-gray-500 hover:text-white transition"
          title="Kapat"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
