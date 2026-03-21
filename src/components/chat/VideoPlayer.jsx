import { useState, useRef, useCallback, useEffect } from "react";

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <polygon points="6 3 20 12 6 21" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <rect x="5" y="3" width="4" height="18" rx="1" />
    <rect x="15" y="3" width="4" height="18" rx="1" />
  </svg>
);
const VolumeIcon = ({ muted, volume }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
    {!muted && volume > 0 && <path d="M15.54 8.46a5 5 0 010 7.07" />}
    {!muted && volume > 0.5 && <path d="M19.07 4.93a10 10 0 010 14.14" />}
    {(muted || volume === 0) && <line x1="22" y1="9" x2="16" y2="15" />}
    {(muted || volume === 0) && <line x1="16" y1="9" x2="22" y2="15" />}
  </svg>
);
const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
  </svg>
);
const PiPIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <rect x="11" y="9" width="10" height="7" rx="1" fill="currentColor" opacity="0.3" />
  </svg>
);

function fmtTime(s) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VideoPlayer({ src, type, fileName, fileSize, fmtFileSize, onDownload }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeTimeout = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("cl-video-vol") || "1"); } catch { return 1; }
  });
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolume, setShowVolume] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  const hideTimer = useRef(null);

  // Auto-hide controls
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [playing]);

  const onMouseMove = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const onMouseLeave = useCallback(() => {
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 800);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else scheduleHide();
    return () => clearTimeout(hideTimer.current);
  }, [playing, scheduleHide]);

  // Video events
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || seeking) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
  }, [seeking]);

  const onLoaded = useCallback(() => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  }, []);

  const onEnded = useCallback(() => setPlaying(false), []);

  // Play/Pause
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  // Volume
  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.volume = volume; v.muted = muted; }
    localStorage.setItem("cl-video-vol", String(volume));
  }, [volume, muted]);

  // Seek via progress bar
  const handleProgressInteraction = useCallback((e, commit = false) => {
    const bar = progressRef.current;
    if (!bar || !videoRef.current) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = ratio * duration;
    if (commit) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
      setSeeking(false);
    } else {
      setHoverTime(t);
      setHoverX(e.clientX - rect.left);
      if (seeking) {
        setCurrentTime(t);
      }
    }
  }, [duration, seeking]);

  const onProgressDown = useCallback((e) => {
    e.preventDefault();
    setSeeking(true);
    handleProgressInteraction(e, false);
  }, [handleProgressInteraction]);

  useEffect(() => {
    if (!seeking) return;
    const onMove = (e) => handleProgressInteraction(e, false);
    const onUp = (e) => handleProgressInteraction(e, true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [seeking, handleProgressInteraction]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }, []);

  // PiP
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative group/video overflow-hidden bg-black select-none ${isFullscreen ? "w-screen h-screen flex items-center justify-center" : "max-w-lg rounded-xl"}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className={`cursor-pointer ${isFullscreen ? "w-full h-full object-contain" : "w-full max-h-[28rem]"}`}
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
        onEnded={onEnded}
      >
        <source src={src} type={type} />
      </video>

      {/* Center play button (when paused) */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition pl-1">
            <PlayIcon />
          </div>
        </button>
      )}

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-2.5 pt-6">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="group/bar w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-2 relative hover:h-2 transition-all"
            onMouseDown={onProgressDown}
            onMouseMove={(e) => {
              const rect = progressRef.current?.getBoundingClientRect();
              if (!rect) return;
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverTime(ratio * duration);
              setHoverX(e.clientX - rect.left);
            }}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Buffer */}
            <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full" style={{ width: `${bufferProgress}%` }} />
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-indigo-500 rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity border-2 border-white"
              style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
            />
            {/* Hover tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-8 bg-black/90 text-white text-[11px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap"
                style={{ left: hoverX, transform: "translateX(-50%)" }}
              >
                {fmtTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-indigo-300 transition p-0.5">
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Time */}
            <span className="text-[12px] text-white/80 font-mono tabular-nums min-w-[4.5rem]">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => { clearTimeout(volumeTimeout.current); setShowVolume(true); }}
              onMouseLeave={() => { volumeTimeout.current = setTimeout(() => setShowVolume(false), 300); }}
            >
              <button onClick={() => setMuted(m => !m)} className="text-white hover:text-indigo-300 transition p-0.5">
                <VolumeIcon muted={muted} volume={volume} />
              </button>
              {showVolume && (
                <div className="ml-1 w-20 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                    className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer accent-indigo-500
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow"
                  />
                </div>
              )}
            </div>

            {/* PiP */}
            <button onClick={togglePiP} className="text-white/70 hover:text-white transition p-0.5" title="Pencere icinde pencere">
              <PiPIcon />
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition p-0.5" title="Tam ekran">
              <FullscreenIcon />
            </button>

            {/* Download */}
            {onDownload && (
              <button onClick={onDownload} className="text-white/70 hover:text-white transition p-0.5" title="Indir">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File info (top-left on hover) */}
      {fileName && (
        <div className={`absolute top-2 left-2.5 transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0"}`}>
          <span className="text-[11px] text-white/90 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm font-medium">
            {fileName}{fileSize ? ` \u00B7 ${fmtFileSize(fileSize)}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
