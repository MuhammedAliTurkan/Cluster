import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ParticipantEvent, ConnectionState, RoomEvent } from "livekit-client";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";
import { fetchLiveKitToken, notifyVoiceJoin, notifyVoiceLeave } from "../../services/livekitApi";
import VoiceRoomContent from "./VoiceRoomContent";
import ParticipantStateSync from "./ParticipantStateSync";
import VolumeApplicator from "./VolumeApplicator";
import ScreenSharePiP from "./ScreenSharePiP";
import { sounds } from "../../utils/sounds";

/**
 * Mikrofon durumunu event-based senkronize eder.
 */
function VoiceSync({ channelId }) {
  const { localParticipant } = useLocalParticipant();
  const media = useMedia();
  const joinNotifiedRef = useRef(null);

  useEffect(() => {
    media.registerParticipant(localParticipant, channelId);
    // LiveKit bağlantısı kuruldu — sidebar'a bildir (kanal başına sadece 1 kez)
    if (channelId && joinNotifiedRef.current !== channelId) {
      joinNotifiedRef.current = channelId;
      notifyVoiceJoin(channelId);
    }
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
 * LiveKitRoom içinde render edilir — bağlantı durumu ve ping bilgisini MediaContext'e aktarır.
 */
function ConnectionMonitor() {
  const room = useRoomContext();
  const connState = useConnectionState();
  const media = useMedia();

  // Connection state'i MediaContext'e aktar
  useEffect(() => {
    const stateMap = {
      [ConnectionState.Connecting]: "connecting",
      [ConnectionState.Connected]: "connected",
      [ConnectionState.Reconnecting]: "reconnecting",
      [ConnectionState.Disconnected]: "disconnected",
    };
    media.setConnectionInfo((prev) => ({
      ...prev,
      state: stateMap[connState] || "disconnected",
    }));
  }, [connState]);

  // Ping (RTT) ölçümü — her 3 saniyede
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      try {
        // SignalClient.rtt zaten milisaniye cinsinden
        const rtt = room.engine?.client?.rtt;
        if (rtt != null && rtt > 0) {
          media.setConnectionInfo((prev) => ({
            ...prev,
            ping: Math.round(rtt),
          }));
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [room]);

  return null;
}

/**
 * Yeni katilimcilarin audio track'lerinin subscribe edilmesini garanti eder.
 * LiveKit bazen yeni katilimcinin track'ini otomatik subscribe etmeyebilir.
 */
function AudioGuard() {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const ensureAudioSubscribed = () => {
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (!pub.isSubscribed && pub.trackSid) {
            pub.setSubscribed(true);
          }
        }
      }
    };

    // Yeni katilimci geldiginde veya track yayinlandiginda kontrol et
    const onTrackPublished = () => setTimeout(ensureAudioSubscribed, 500);
    const onParticipantConnected = () => setTimeout(ensureAudioSubscribed, 1000);

    room.on(RoomEvent.TrackPublished, onTrackPublished);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);

    // Mevcut katilimcilari da kontrol et
    ensureAudioSubscribed();

    return () => {
      room.off(RoomEvent.TrackPublished, onTrackPublished);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
    };
  }, [room]);

  return null;
}

/**
 * Kalıcı ses bağlantısı — TEK İNSTANCE.
 * MainApp'te layout container'ların dışında render edilir.
 * LiveKitRoom her zaman aynı portal pozisyonunda kalır — unmount/remount olmaz.
 */
export default function PersistentVoice({ docked = false, containerNode }) {
  const media = useMedia();
  const { activeServerId, setActiveChannelId, lastVisitedByServer } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  const isOnVoiceRoute = location.pathname.startsWith("/app/voice/");
  const isFullView = isOnVoiceRoute && !docked;

  // F5 sonrası — otomatik bağlanma yerine geri dönme bildirimi göster
  useEffect(() => {
    if (media.voiceState || !media.pendingVoiceChannelId) return;
    const chId = media.pendingVoiceChannelId;
    const src = media.voiceSource || localStorage.getItem("cl-voiceSource");
    // localStorage temizle — artık otomatik bağlanma yok
    localStorage.removeItem("cl-voiceChannelId");
    localStorage.removeItem("cl-voiceSource");
    // Geri dönme bildirimi göster
    media.setDisconnectedRoom({ channelId: chId, source: src, timestamp: Date.now() });
  }, []);

  const onLeave = useCallback(() => {
    sounds.leave();
    const chId = media.voiceState?.channelId;
    const source = media.voiceSource;
    // Backend'e ayrılma bildirimi gönder (sidebar anlık güncellenir)
    if (chId) notifyVoiceLeave(chId);
    media.leaveCall();
    if (source === "dm") {
      navigate("/app/friends", { replace: true });
    } else {
      const lastTextCh = activeServerId && lastVisitedByServer[activeServerId];
      if (lastTextCh) setActiveChannelId(lastTextCh);
      navigate("/app/chat", { replace: true });
    }
  }, [media, navigate, activeServerId, lastVisitedByServer, setActiveChannelId]);

  // LiveKit bağlantısı beklenmedik şekilde koptuğunda
  const onDisconnected = useCallback(() => {
    if (media.intentionalLeaveRef.current) return;
    console.warn("[PersistentVoice] Unexpected disconnect");
    const chId = media.voiceState?.channelId;
    if (chId) notifyVoiceLeave(chId);
    media.handleUnexpectedDisconnect();
  }, [media]);

  // Tuş ataması ile ayrılma
  useEffect(() => {
    const handler = () => onLeave();
    window.addEventListener("keybind-leave-call", handler);
    return () => window.removeEventListener("keybind-leave-call", handler);
  }, [onLeave]);

  // Sayfa kapanırken leave bildirimi
  useEffect(() => {
    const handler = () => {
      const chId = media.voiceState?.channelId;
      if (chId) notifyVoiceLeave(chId);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [media.voiceState?.channelId]);

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

  // Ses ve video ayarlarını localStorage'dan oku (hook'lar early return'den önce olmalı)
  const roomOptions = useMemo(() => {
    const audioSettings = (() => {
      try { return JSON.parse(localStorage.getItem("cl-audio-processing") || "{}"); } catch { return {}; }
    })();
    const quality = (() => {
      try { return JSON.parse(localStorage.getItem("clusterQuality") || "{}"); } catch { return {}; }
    })();

    // Bitrate hesaplama
    const camPresets = { "360p": [640, 360], "480p": [854, 480], "720p": [1280, 720], "1080p": [1920, 1080] };
    const screenPresets = { "360p": [640, 360], "720p": [1280, 720], "1080p": [1920, 1080], "1440p": [2560, 1440] };
    const bitratePresets = { "Düşük": 0.5, "Orta": 1.0, "Yüksek": 1.5 };

    const calcBitrate = (w, h, fps, mode, custom) => {
      if (mode === "Otomatik") return null; // LiveKit adaptif ayarlar
      const base = Math.round((w * h * 3 * (fps / 30)) / 1000);
      const clamped = Math.max(200, Math.min(base, 15000));
      if (mode === "Özel") return (custom || 2500) * 1000;
      return Math.round(clamped * (bitratePresets[mode] || 1.0)) * 1000;
    };

    const [cw, ch] = camPresets[quality.camRes] || [640, 480];
    const cFps = quality.camFps || 24;
    const camBitrate = calcBitrate(cw, ch, cFps, quality.bitrateMode || "Otomatik", quality.customBitrate);

    const [sw, sh] = screenPresets[quality.screenRes] || [1280, 720];
    const sFps = quality.screenFps || 15;
    const screenBitrate = calcBitrate(sw, sh, sFps, quality.screenBitrateMode || "Otomatik", quality.screenCustomBitrate);

    const opts = {
      audioCaptureDefaults: {
        noiseSuppression: audioSettings.noiseSuppression !== false,
        echoCancellation: audioSettings.echoCancellation !== false,
        autoGainControl: audioSettings.autoGainControl !== false,
        channelCount: 1,
        ...(audioSettings.deviceId ? { deviceId: audioSettings.deviceId } : {}),
      },
      videoCaptureDefaults: {
        resolution: { width: cw, height: ch, frameRate: cFps },
      },
      publishDefaults: {
        // Otomatik modda encoding ayarlamaz — LiveKit/WebRTC adaptif bitrate kullanır
        ...(camBitrate ? { videoEncoding: { maxBitrate: camBitrate, maxFramerate: cFps } } : {}),
        ...(screenBitrate ? { screenShareEncoding: { maxBitrate: screenBitrate, maxFramerate: sFps } } : {}),
      },
    };
    opts.adaptiveStream = true;
    opts.dynacast = true;
    opts.autoSubscribe = true; // Yeni katilimcilarin track'lerine otomatik subscribe ol

    // Reconnect ayarları — kısa ağ kesintilerinde düşmemesi için
    opts.reconnectPolicy = {
      nextRetryDelayInMs: (context) => {
        // 7 denemeye kadar (toplam ~30sn) yeniden bağlanmayı dene
        if (context.retryCount > 7) return null; // artık vazgeç
        // Exponential backoff: 500, 1000, 2000, 3000, 4000, 5000, 5000ms
        return Math.min(500 * Math.pow(2, context.retryCount), 5000);
      },
    };
    opts.disconnectOnPageLeave = false; // Sayfa arka plana geçince bağlantıyı kesme
    return opts;
  }, []);

  if (!media.voiceState) return null;

  const { token, wsUrl, channelId } = media.voiceState;

  const hiddenStyle = { position: "fixed", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" };
  const overlayStyle = rect
    ? { position: "fixed", top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: 50 }
    : { position: "fixed", inset: 0, zIndex: 50 };

  // Docked modda VoiceRoomContent containerNode'a portal edilir
  // Voice her zaman dock panelde veya gizli — tam ekran overlay yok
  const nodeInDOM = containerNode && document.body.contains(containerNode);
  const showInDock = docked && nodeInDOM;
  const showInOverlay = false; // overlay devre dışı — panel kapatılınca arka planda çalışır

  // Her zaman aynı portal pozisyonunda — sadece style değişir
  return createPortal(
    <div style={showInOverlay ? overlayStyle : hiddenStyle}>
      <LiveKitRoom
        serverUrl={wsUrl}
        token={token}
        connect={true}
        audio={true}
        video={false}
        options={roomOptions}
        onDisconnected={onDisconnected}
        style={{ height: "100%", width: "100%" }}
      >
        <VoiceSync channelId={channelId} />
        <ConnectionMonitor />
        <AudioGuard />
        <ParticipantStateSync />
        <VolumeApplicator />
        <RoomAudioRenderer />
        {showInOverlay && <VoiceRoomContent channelId={channelId} onLeave={onLeave} />}
        {showInDock && createPortal(
          <VoiceRoomContent channelId={channelId} onLeave={onLeave} />,
          containerNode
        )}
        <PiPPortal channelId={channelId} isFullView={isFullView || docked} />
      </LiveKitRoom>
    </div>,
    document.body
  );
}
