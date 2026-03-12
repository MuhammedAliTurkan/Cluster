import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ParticipantEvent } from "livekit-client";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import { fetchLiveKitToken } from "../../services/livekitApi";
import VoiceRoomContent from "./VoiceRoomContent";
import ParticipantStateSync from "./ParticipantStateSync";
import VolumeApplicator from "./VolumeApplicator";
import ScreenSharePiP from "./ScreenSharePiP";

/**
 * Mikrofon durumunu event-based senkronize eder.
 */
function VoiceSync({ channelId }) {
  const { localParticipant } = useLocalParticipant();
  const media = useMedia();

  useEffect(() => {
    media.registerParticipant(localParticipant, channelId);
    return () => media.unregisterParticipant();
  }, [localParticipant, channelId]);

  useEffect(() => {
    if (!localParticipant) return;
    const sync = () => {
      const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
      media.syncMic(!!pub && !pub.isMuted);
    };
    const events = [
      ParticipantEvent.TrackMuted,
      ParticipantEvent.TrackUnmuted,
      ParticipantEvent.LocalTrackPublished,
      ParticipantEvent.LocalTrackUnpublished,
    ];
    events.forEach((e) => localParticipant.on(e, sync));
    sync();
    return () => events.forEach((e) => localParticipant.off(e, sync));
  }, [localParticipant]);

  return null;
}

/**
 * PiP bileşenini portal ile body'ye render eder.
 */
function PiPPortal({ channelId, isFullView }) {
  if (isFullView) return null;
  return createPortal(
    <ScreenSharePiP channelId={channelId} />,
    document.body
  );
}

/**
 * Kalıcı ses bağlantısı — TEK İNSTANCE.
 * MainApp'te layout container'ların dışında render edilir.
 * LiveKitRoom her zaman aynı portal pozisyonunda kalır — unmount/remount olmaz.
 */
export default function PersistentVoice() {
  const media = useMedia();
  const { activeServerId, setActiveChannelId, lastVisitedByServer } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  const isFullView = location.pathname.startsWith("/app/voice/");

  // F5 sonrası otomatik yeniden bağlanma
  useEffect(() => {
    if (media.voiceState || !media.pendingVoiceChannelId) return;
    const chId = media.pendingVoiceChannelId;
    let alive = true;
    (async () => {
      try {
        const data = await fetchLiveKitToken(chId, "audio");
        if (!alive) return;
        media.startVoice(data.token, data.wsUrl, chId);
      } catch (err) {
        console.error("Voice auto-rejoin failed:", err);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onLeave = useCallback(() => {
    media.leaveCall();
    // Son text kanalına geri dön
    const lastTextCh = activeServerId && lastVisitedByServer[activeServerId];
    if (lastTextCh) setActiveChannelId(lastTextCh);
    navigate("/app/chat", { replace: true });
  }, [media, navigate, activeServerId, lastVisitedByServer, setActiveChannelId]);

  // İçerik alanı ölçümü (overlay pozisyonu için)
  useEffect(() => {
    if (!isFullView || !media.voiceState) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const measure = () => {
      const container = document.querySelector("[data-content-area]");
      if (container) {
        const r = container.getBoundingClientRect();
        setRect((prev) => {
          if (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height) return prev;
          return { top: r.top, left: r.left, width: r.width, height: r.height };
        });
      } else {
        setRect({ top: 0, left: 72, width: window.innerWidth - 72, height: window.innerHeight });
      }
      rafRef.current = requestAnimationFrame(measure);
    };
    measure();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isFullView, !!media.voiceState]);

  if (!media.voiceState) return null;

  const { token, wsUrl, channelId } = media.voiceState;

  const hiddenStyle = { position: "fixed", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" };
  const overlayStyle = rect
    ? { position: "fixed", top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: 50 }
    : { position: "fixed", inset: 0, zIndex: 50 };

  // Her zaman aynı portal pozisyonunda — sadece style değişir
  return createPortal(
    <div style={isFullView ? overlayStyle : hiddenStyle}>
      <LiveKitRoom
        serverUrl={wsUrl}
        token={token}
        connect={true}
        audio={true}
        video={false}
        style={{ height: "100%", width: "100%" }}
      >
        <VoiceSync channelId={channelId} />
        <ParticipantStateSync />
        <VolumeApplicator />
        <RoomAudioRenderer />
        {isFullView && <VoiceRoomContent channelId={channelId} onLeave={onLeave} />}
        <PiPPortal channelId={channelId} isFullView={isFullView} />
      </LiveKitRoom>
    </div>,
    document.body
  );
}
