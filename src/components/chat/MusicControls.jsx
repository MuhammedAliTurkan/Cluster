import { useState, useEffect } from "react";
import { getServerBotCommands } from "../../services/botApi";
import { useMedia } from "../../context/MediaContext";
import { publishApp } from "../../services/ws";

const SkipIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M6 4l12 8-12 8V4zm12 0v16h2V4h-2z" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

const QueueIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M4 6h16M4 12h12M4 18h8" strokeLinecap="round" />
  </svg>
);

const NowPlayingIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
  </svg>
);

export default function MusicControls({ channelId, serverId }) {
  const [hasMusicBot, setHasMusicBot] = useState(false);

  useEffect(() => {
    if (!serverId) return;
    getServerBotCommands(serverId)
      .then((cmds) => {
        setHasMusicBot(cmds.some((c) => c.name === "play" || c.name === "stop"));
      })
      .catch(() => setHasMusicBot(false));
  }, [serverId]);

  const media = useMedia();

  if (!hasMusicBot || !channelId) return null;

  const send = (cmd) => {
    if (!media.inCall) return;
    publishApp(`/app/channels/${channelId}/send`, {
      content: cmd,
      type: "TEXT",
      parentMessageId: null,
    });
  };

  const inVoice = media.inCall;
  const btnBase = inVoice
    ? "p-1.5 rounded-lg bg-surface-4 text-gray-400 transition cursor-pointer"
    : "p-1.5 rounded-lg bg-surface-4 text-gray-600 opacity-40 cursor-not-allowed";

  return (
    <div className="flex items-center gap-1.5 ml-2 mr-2 mb-1.5" title={!inVoice ? "Sesli odada olmanız gerek" : undefined}>
      <button
        onClick={() => send("!np")}
        disabled={!inVoice}
        title="Şu an çalanı göster"
        className={`${btnBase} ${inVoice ? "hover:bg-indigo-500/20 hover:text-indigo-400" : ""}`}
      >
        <NowPlayingIcon />
      </button>
      <button
        onClick={() => send("!skip")}
        disabled={!inVoice}
        title="Sonraki şarkı"
        className={`${btnBase} ${inVoice ? "hover:bg-amber-500/20 hover:text-amber-400" : ""}`}
      >
        <SkipIcon />
      </button>
      <button
        onClick={() => send("!stop")}
        disabled={!inVoice}
        title="Müziği durdur"
        className={`${btnBase} ${inVoice ? "hover:bg-rose-500/20 hover:text-rose-400" : ""}`}
      >
        <StopIcon />
      </button>
      <button
        onClick={() => send("!queue")}
        disabled={!inVoice}
        title="Kuyruğu göster"
        className={`${btnBase} ${inVoice ? "hover:bg-emerald-500/20 hover:text-emerald-400" : ""}`}
      >
        <QueueIcon />
      </button>
    </div>
  );
}
