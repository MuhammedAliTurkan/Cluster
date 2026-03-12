import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTracks, VideoTrack, useParticipantInfo } from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * Ses kanalı sayfası dışındayken ekran paylaşımını
 * küçük sürüklenebilir pencerede gösterir.
 */
export default function ScreenSharePiP({ channelId }) {
  const navigate = useNavigate();
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const activeScreen = screenTracks.length > 0 ? screenTracks[0] : null;

  const [pos, setPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 220 });
  const [minimized, setMinimized] = useState(false);
  const [watching, setWatching] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e) => {
    if (e.target.closest("button")) return; // butonlara tıklayınca sürükleme
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    document.body.style.userSelect = "none";

    const onMove = (ev) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(ev.clientX - offset.current.x, window.innerWidth - 320)),
        y: Math.max(0, Math.min(ev.clientY - offset.current.y, window.innerHeight - 200)),
      });
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  if (!activeScreen) return null;

  const goToVoice = () => navigate(`/app/voice/${channelId}`);

  if (minimized) {
    return (
      <div
        style={{ left: pos.x, top: pos.y, position: "fixed", zIndex: 9990 }}
        className="bg-[#1e1f22] rounded-xl shadow-2xl border border-purple-500/30 px-3 py-2 flex items-center gap-2 cursor-move"
        onMouseDown={onMouseDown}
      >
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <span className="text-xs text-purple-300 font-medium">Ekran Paylaşımı</span>
        <button onClick={() => setMinimized(false)} className="text-gray-400 hover:text-white text-xs ml-1" title="Büyüt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
          </svg>
        </button>
        <button onClick={goToVoice} className="text-gray-400 hover:text-emerald-400 text-xs" title="Ses kanalına git">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y, position: "fixed", zIndex: 9990 }}
      className="w-80 bg-[#111118] rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden cursor-move"
      onMouseDown={onMouseDown}
    >
      {/* Video */}
      <div className="w-full aspect-video bg-black relative">
        {watching ? (
          <>
            <VideoTrack trackRef={activeScreen} className="w-full h-full object-contain" />
            <SharerLabel participant={activeScreen.participant} />
            <button
              onClick={() => setWatching(false)}
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/80 text-[9px] text-gray-300 hover:text-white transition"
            >
              Kapat
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#a855f6" className="w-6 h-6">
              <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.6" />
              <path d="M8 21h8m-4-4v4" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] text-gray-400">Ekran paylaşılıyor</span>
            <button
              onClick={() => setWatching(true)}
              className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-medium transition"
            >
              Yayını İzle
            </button>
          </div>
        )}
      </div>

      {/* Kontroller */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a12]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[10px] text-purple-300">Ekran Paylaşımı</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition" title="Küçült">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={goToVoice} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition" title="Ses kanalına git">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SharerLabel({ participant }) {
  const { name, identity } = useParticipantInfo({ participant });
  return (
    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white">
      {name || identity} paylaşıyor
    </div>
  );
}
