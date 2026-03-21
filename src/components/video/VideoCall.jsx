import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  useParticipantInfo,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { fetchLiveKitToken } from "../../services/livekitApi";
import QualitySettings from "../media/QualitySettings";
import Avatar from "../common/Avatar";
import { useMedia } from "../../context/MediaContext";

/** Participant metadata'dan avatar URL çıkar */
function useParticipantAvatar(participant) {
  return useMemo(() => {
    try {
      const meta = JSON.parse(participant.metadata || "{}");
      return meta.avatarUrl || null;
    } catch { return null; }
  }, [participant.metadata]);
}

/* ── Katılımcı kartı ── */
function ParticipantCard({ participant, isLocal }) {
  const isSpeaking = useIsSpeaking(participant);
  const { name, identity } = useParticipantInfo({ participant });
  const displayName = name || identity || "?";
  const avatarUrl = useParticipantAvatar(participant);

  const camPub = participant.getTrackPublication(Track.Source.Camera);
  const camTrack = camPub?.track;
  const hasVideo = !!camTrack && !camPub.isMuted;

  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = !micPub || micPub.isMuted;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-surface-1 transition-all duration-200 ${
        isSpeaking ? "ring-2 ring-emerald-500" : "ring-1 ring-white/10"
      }`}
      style={{ aspectRatio: "16/9" }}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={{ participant, source: Track.Source.Camera, publication: camPub }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className={`rounded-full transition-all duration-200 ${isSpeaking ? "ring-[3px] ring-emerald-500" : ""}`}>
            <Avatar src={avatarUrl} name={displayName} size={80} />
          </div>
        </div>
      )}

      {/* Alt bilgi çubuğu */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-2">
        <Avatar src={avatarUrl} name={displayName} size={22} />
        <span className="text-sm text-white truncate">
          {displayName}{isLocal && " (Sen)"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isMuted && (
            <div className="w-5 h-5 rounded-full bg-red-500/80 grid place-items-center" title="Mikrofon kapalı">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-3 h-3">
                <path d="M1 1l22 22" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          {!hasVideo && (
            <div className="w-5 h-5 rounded-full bg-red-500/80 grid place-items-center" title="Kamera kapalı">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-3 h-3">
                <path d="M1 1l22 22" strokeWidth="2" strokeLinecap="round"/>
                <path d="M21 7l-5 3.5V7a1 1 0 0 0-1-1H9m-4 0a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          {isSpeaking && (
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Ekran paylaşımı görüntüsü ── */
function ScreenShareView({ trackRef }) {
  if (!trackRef) return null;
  return (
    <div className="w-full h-full rounded-xl overflow-hidden ring-1 ring-purple-500/50">
      <VideoTrack trackRef={trackRef} className="w-full h-full object-contain bg-black" />
    </div>
  );
}

/* ── Ana içerik ── */
function RoomContent({ mode, onLeave, channelId }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const media = useMedia();
  const [showQuality, setShowQuality] = useState(false);

  // MediaContext'e localParticipant'ı kaydet
  useEffect(() => {
    media.registerParticipant(localParticipant, channelId);
    return () => media.unregisterParticipant();
  }, [localParticipant, channelId]);

  // Mic durumunu MediaContext ile senkronize et
  useEffect(() => {
    media.syncMic(isMicrophoneEnabled);
  }, [isMicrophoneEnabled]);

  const micEnabled = isMicrophoneEnabled;
  const camEnabled = isCameraEnabled;
  const screenSharing = isScreenShareEnabled;

  // Ekran paylaşımı track'i bul
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const activeScreen = screenTracks.length > 0 ? screenTracks[0] : null;

  const toggleMic = () => media.toggleMic();
  const toggleCam = async () => {
    // Kamera açılacaksa izin kontrolü yap
    if (!camEnabled) {
      try {
        const perm = await navigator.permissions.query({ name: "camera" });
        if (perm.state === "denied") {
          toast.error("Kamera izni engellendi. Lütfen tarayıcının adres çubuğundaki kamera/kilit simgesine tıklayarak izni sıfırlayın ve tekrar deneyin.");
          return;
        }
      } catch { /* permissions API desteklenmiyorsa devam et */ }
      // "prompt" durumunda önce izin iste
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.error("Kamera izni alınamadı:", e);
        if (e.name === "NotAllowedError") {
          toast.error("Kamera izni reddedildi. Kamerayı kullanmak için izin vermeniz gerekiyor.");
        }
        return;
      }
    }
    try {
      await localParticipant.setCameraEnabled(!camEnabled);
    } catch (e) { console.error("Cam toggle error:", e); }
  };
  const toggleScreen = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!screenSharing);
    } catch (e) { console.error("Screen share error:", e); }
  };
  const leave = () => {
    localParticipant.room?.disconnect();
    onLeave();
  };

  // Katılımcı listesi — ekran paylaşımı varsa layout değişir
  const hasScreen = !!activeScreen;

  return (
    <div className="h-full w-full flex flex-col bg-surface-1">
      {/* Video alanı */}
      <div className="flex-1 min-h-0 p-3 flex gap-3">
        {hasScreen ? (
          /* Ekran paylaşımı aktif: büyük ekran + sağda küçük katılımcılar */
          <>
            <div className="flex-1 min-w-0">
              <ScreenShareView trackRef={activeScreen} />
            </div>
            <div className="w-48 shrink-0 flex flex-col gap-2 overflow-y-auto">
              {participants.map((p) => (
                <ParticipantCard
                  key={p.identity}
                  participant={p}
                  isLocal={p.identity === localParticipant.identity}
                />
              ))}
            </div>
          </>
        ) : (
          /* Normal grid */
          <div className={`w-full grid gap-3 auto-rows-fr ${
            participants.length <= 1 ? "grid-cols-1 max-w-2xl mx-auto" :
            participants.length <= 4 ? "grid-cols-2" :
            participants.length <= 9 ? "grid-cols-3" :
            "grid-cols-4"
          }`}>
            {participants.map((p) => (
              <ParticipantCard
                key={p.identity}
                participant={p}
                isLocal={p.identity === localParticipant.identity}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alt kontrol çubuğu */}
      <div className="shrink-0 px-4 py-3 bg-surface-0 border-t border-white/5">
        <div className="flex items-center justify-center gap-2 relative">
          {/* Mikrofon */}
          <button
            onClick={toggleMic}
            className={`w-11 h-11 rounded-full grid place-items-center transition ${
              micEnabled
                ? "bg-surface-3 text-white hover:bg-surface-5"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
            title={micEnabled ? "Mikrofonu kapat" : "Mikrofonu aç"}
          >
            {micEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <rect x="9" y="1" width="6" height="11" rx="3" strokeWidth="1.6"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M12 19v4m-4 0h8" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M17 16.95A7 7 0 0 1 5 12m14 0a7 7 0 0 1-.11 1.23" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M12 19v4m-4 0h8" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Kamera */}
          <button
            onClick={toggleCam}
            className={`w-11 h-11 rounded-full grid place-items-center transition ${
              camEnabled
                ? "bg-surface-3 text-white hover:bg-surface-5"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
            title={camEnabled ? "Kamerayı kapat" : "Kamerayı aç"}
          >
            {camEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path d="M23 7l-7 5 7 5V7z" strokeWidth="1.6"/>
                <rect x="1" y="5" width="15" height="14" rx="2" strokeWidth="1.6"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M23 7l-7 5 7 5V7z" strokeWidth="1.6"/>
                <rect x="1" y="5" width="15" height="14" rx="2" strokeWidth="1.6"/>
              </svg>
            )}
          </button>

          {/* Ekran paylaşımı */}
          <button
            onClick={toggleScreen}
            className={`w-11 h-11 rounded-full grid place-items-center transition ${
              screenSharing
                ? "bg-purple-500 text-white hover:bg-purple-600"
                : "bg-surface-3 text-white hover:bg-surface-5"
            }`}
            title={screenSharing ? "Paylaşımı durdur" : "Ekran paylaş"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.6"/>
              <path d="M8 21h8m-4-4v4" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Kalite Ayarları */}
          <button onClick={() => setShowQuality(!showQuality)}
            className={`w-11 h-11 rounded-full grid place-items-center transition ${
              showQuality ? "bg-blue-500 text-white" : "bg-surface-3 text-gray-400 hover:bg-surface-5 hover:text-white"
            }`} title="Kalite ayarları">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" strokeWidth="1.6"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="1.6"/>
            </svg>
          </button>

          {/* Ayraç */}
          <div className="w-px h-7 bg-white/10 mx-1" />

          {/* Ayrıl */}
          <button
            onClick={leave}
            className="h-11 px-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition flex items-center gap-2"
            title="Görüşmeden ayrıl"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeWidth="1.6"/>
              <path d="M9 12h6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Ayrıl
          </button>

          {/* Kalite ayarları paneli */}
          {showQuality && (
            <QualitySettings
              localParticipant={localParticipant}
              onClose={() => setShowQuality(false)}
            />
          )}
        </div>

        {/* Katılımcı sayısı */}
        <div className="text-center mt-2 text-[11px] text-gray-500">
          {participants.length} katılımcı
        </div>
      </div>
    </div>
  );
}

/* ── Ana bileşen ── */
export default function VideoCall() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get("channelId") || roomId;
  const mode = searchParams.get("mode") || "video";

  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const intentionalLeave = useRef(false);
  const media = useMedia();

  useEffect(() => {
    if (!channelId) {
      setError("channelId bulunamadı");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data = await fetchLiveKitToken(channelId, mode);
        if (!alive) return;
        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        if (!alive) return;
        console.error("LiveKit token fetch error:", err);
        setError(err?.response?.data?.message || err.message || "Token alınamadı");
      }
    })();
    return () => { alive = false; };
  }, [channelId, mode]);

  const onLeave = useCallback(() => {
    intentionalLeave.current = true;
    navigate("/app/friends", { replace: true });
  }, [navigate]);

  const onDisconnected = useCallback(() => {
    if (intentionalLeave.current || media.intentionalLeaveRef.current) {
      navigate("/app/friends", { replace: true });
    }
  }, [navigate, media.intentionalLeaveRef]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-lg">{error}</div>
          <button
            onClick={() => navigate("/app/friends", { replace: true })}
            className="px-4 py-2 bg-surface-3 rounded-lg hover:bg-surface-5 text-white"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-gray-400">Bağlanılıyor...</span>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      video={mode === "video"}
      audio={true}
      onDisconnected={onDisconnected}
      style={{ height: "100%" }}
    >
      <RoomContent mode={mode} onLeave={onLeave} channelId={channelId} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
