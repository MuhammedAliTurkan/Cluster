import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  useParticipantInfo,
  useTracks,
  VideoTrack,
  useConnectionState,
  useRoomContext,
} from "@livekit/components-react";
import { Track, ParticipantEvent, RoomEvent, ConnectionState } from "livekit-client";
import QualitySettings from "../media/QualitySettings";
import Avatar from "../common/Avatar";
import { useMedia } from "../../context/MediaContext";
import { serverApi } from "../../services/serverApi";
import ParticipantVolumeMenu from "./ParticipantVolumeMenu";

/* ── Hook: avatar ── */
function useAvatar(participant) {
  return useMemo(() => {
    try { return JSON.parse(participant?.metadata || "{}").avatarUrl || null; }
    catch { return null; }
  }, [participant?.metadata]);
}

/* ── Hook: mic muted (event-based, reactive) ── */
function useMicMuted(participant) {
  const read = useCallback(() => {
    if (!participant) return true;
    const pub = participant.getTrackPublication(Track.Source.Microphone);
    return !pub || pub.isMuted;
  }, [participant]);

  const [muted, setMuted] = useState(read);

  useEffect(() => {
    if (!participant) return;
    const sync = () => setMuted(read());
    const evts = [
      ParticipantEvent.TrackMuted, ParticipantEvent.TrackUnmuted,
      ParticipantEvent.TrackPublished, ParticipantEvent.TrackUnpublished,
      ParticipantEvent.LocalTrackPublished, ParticipantEvent.LocalTrackUnpublished,
      ParticipantEvent.TrackSubscribed, ParticipantEvent.TrackUnsubscribed,
    ];
    evts.forEach((e) => participant.on(e, sync));
    sync();
    return () => evts.forEach((e) => participant.off(e, sync));
  }, [participant, read]);

  return muted;
}

/* ══════════════════════════════════════════════
   Katılımcı Kartı
   ══════════════════════════════════════════════ */
/* ── Müzik botu ses animasyonu ── */
function MusicBars() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[3px] bg-emerald-400 rounded-full animate-music-bar"
          style={{ animationDelay: `${i * 0.15}s`, height: "100%" }} />
      ))}
      <style>{`
        @keyframes music-bar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-music-bar {
          animation: music-bar 0.8s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
    </div>
  );
}

function ParticipantTile({ participant, isLocal, micOn, camTrack, onMenu, large }) {
  const speaking = useIsSpeaking(participant);
  const { name, identity } = useParticipantInfo({ participant });
  const label = name || identity || "?";
  const avatar = useAvatar(participant);
  const remoteMuted = useMicMuted(participant);
  const muted = isLocal ? !micOn : remoteMuted;
  const isMusicBot = identity?.startsWith("music-bot-");

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onMenu?.({ identity, name: label, avatarUrl: avatar, isLocal, x: e.clientX, y: e.clientY }); }}
      className={`relative rounded-xl overflow-hidden cursor-pointer bg-surface-1 flex flex-col
        ${large ? "h-full" : ""}
        ${isMusicBot ? "ring-2 ring-indigo-500" : speaking ? "ring-2 ring-emerald-500" : "ring-1 ring-white/10"}`}
    >
      {/* İçerik */}
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: large ? 300 : 100 }}>
        {camTrack ? (
          <VideoTrack trackRef={camTrack} className={`w-full h-full object-cover ${isLocal ? "[transform:scaleX(-1)]" : ""}`} />
        ) : (
          <div className="relative py-4">
            <div className={`rounded-[22%] ${isMusicBot ? "ring-[3px] ring-indigo-500 ring-offset-2 ring-offset-black/50" : speaking ? "ring-[3px] ring-emerald-500 ring-offset-2 ring-offset-black/50" : ""}`}>
              <Avatar src={avatar} name={label} size={large ? 96 : 56} />
            </div>
            {isMusicBot && (
              <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white">
                  <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                </svg>
              </div>
            )}
            {!isMusicBot && muted && <MuteBadge corner />}
            {!isMusicBot && speaking && !muted && <SpeakDot />}
          </div>
        )}
      </div>
      {/* Alt bar */}
      <div className={`px-3 py-1 flex items-center gap-2 ${isMusicBot ? "bg-indigo-900/60" : "bg-black/40"}`}>
        {camTrack && <Avatar src={avatar} name={label} size={18} />}
        <span className={`${large ? "text-sm" : "text-[11px]"} text-white truncate flex-1`}>
          {label}{isLocal ? " (Sen)" : ""}
        </span>
        {isMusicBot && <MusicBars />}
        {!isMusicBot && muted && camTrack && <MuteBadge />}
        {!isMusicBot && speaking && !muted && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Ekran Paylaşımı Kartı
   ══════════════════════════════════════════════ */
function ScreenTile({ track, isMine, large }) {
  const [watch, setWatch] = useState(isMine);
  const [streamVol, setStreamVol] = useState(100);
  const containerRef = useRef(null);
  const who = track?.participant?.name || track?.participant?.identity || "Birisi";

  const goFullscreen = (e) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  };

  // Yayın ses seviyesi kontrolü
  useEffect(() => {
    if (!track?.participant || isMine) return;
    const scrAudioPub = track.participant.getTrackPublication(Track.Source.ScreenShareAudio);
    if (scrAudioPub?.track && typeof scrAudioPub.track.setVolume === "function") {
      scrAudioPub.track.setVolume(streamVol / 100);
    }
  }, [streamVol, track, isMine]);

  if (!track) return null;

  return (
    <div ref={containerRef} className={`relative rounded-xl overflow-hidden ring-1 ring-purple-500/40 bg-black flex flex-col ${large ? "h-full" : ""}`}>
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: large ? 300 : 100 }}>
        {watch ? (
          <>
            <VideoTrack trackRef={track} className="w-full h-full object-contain" />
            <div className="absolute top-2 right-2 flex gap-1.5 z-10">
              {/* Yayın ses seviyesi — izleyiciler için */}
              {!isMine && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70" onClick={e => e.stopPropagation()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-400 shrink-0"><path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <input
                    type="range" min="0" max="200" value={streamVol}
                    onChange={e => setStreamVol(Number(e.target.value))}
                    className="w-16 h-1 accent-purple-500"
                    title={`Yayın sesi: ${streamVol}%`}
                  />
                  <span className="text-[9px] text-gray-400 w-7 text-right">{streamVol}%</span>
                </div>
              )}
              <button onClick={goFullscreen}
                className="px-2 py-1 rounded bg-black/70 text-gray-300 hover:text-white" title="Tam ekran">
                <FullscreenSvg />
              </button>
              {!isMine && (
                <button onClick={(e) => { e.stopPropagation(); setWatch(false); }}
                  className="px-2 py-1 rounded bg-black/70 text-gray-300 hover:text-white text-[10px]">
                  Kapat
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <ScreenSvg size={32} color="#a855f6" />
            <span className="text-[11px] text-gray-400">{who} ekran paylaşıyor</span>
            <button onClick={(e) => { e.stopPropagation(); setWatch(true); }}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5">
              <PlaySvg /> Yayını İzle
            </button>
          </div>
        )}
      </div>
      <div className="px-3 py-1 bg-black/50 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <span className="text-[10px] text-purple-300 truncate">{who} — Ekran</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Küçük SVG'ler
   ══════════════════════════════════════════════ */
function MuteBadge({ corner }) {
  return (
    <div className={`w-5 h-5 rounded-full bg-red-500 grid place-items-center ${corner ? "absolute -bottom-1 -right-1" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-3 h-3">
        <path d="M1 1l22 22" strokeWidth="2" strokeLinecap="round" /><path d="M9 9v3a3 3 0 005.12 2.12" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
function SpeakDot() {
  return <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center"><div className="w-2 h-2 rounded-full bg-white animate-pulse" /></div>;
}
function FullscreenSvg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ScreenSvg({ size = 20, color = "currentColor" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} style={{ width: size, height: size }}><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.6" /><path d="M8 21h8m-4-4v4" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
function PlaySvg() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="5,3 19,12 5,21" /></svg>;
}

/* ── Kontrol buton ikonları ── */
const I = {
  micOn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><rect x="9" y="1" width="6" height="11" rx="3" strokeWidth="1.6"/><path d="M19 10v2a7 7 0 01-14 0v-2" strokeWidth="1.6" strokeLinecap="round"/><path d="M12 19v4m-4 0h8" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" strokeWidth="1.6" strokeLinecap="round"/><path d="M17 16.95A7 7 0 015 12m14 0a7 7 0 01-.11 1.23" strokeWidth="1.6" strokeLinecap="round"/><path d="M12 19v4m-4 0h8" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  deafOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M3 14h2a2 2 0 012 2v3a2 2 0 01-2 2H3v-7z" strokeWidth="1.6"/><path d="M21 14h-2a2 2 0 00-2 2v3a2 2 0 002 2h2v-7z" strokeWidth="1.6"/><path d="M3 14v-2a9 9 0 1118 0v2" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  deafOn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/><path d="M3 14h2a2 2 0 012 2v3a2 2 0 01-2 2H3v-7z" strokeWidth="1.6"/><path d="M21 14h-2a2 2 0 00-2 2v3a2 2 0 002 2h2v-7z" strokeWidth="1.6"/><path d="M3 14v-2a9 9 0 0115.66-6.08" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  camOn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M23 7l-7 5 7 5V7z" strokeWidth="1.6"/><rect x="1" y="5" width="15" height="14" rx="2" strokeWidth="1.6"/></svg>,
  camOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M1 1l22 22" strokeWidth="1.6" strokeLinecap="round"/><path d="M23 7l-7 5 7 5V7z" strokeWidth="1.6"/><rect x="1" y="5" width="15" height="14" rx="2" strokeWidth="1.6"/></svg>,
  screen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.6"/><path d="M8 21h8m-4-4v4" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><circle cx="12" cy="12" r="3" strokeWidth="1.6"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="1.6"/></svg>,
  leave: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M9 12h6" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="10" strokeWidth="1.6"/></svg>,
  volOn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5z" strokeWidth="1.6"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  volOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5z" strokeWidth="1.6"/><path d="M23 9l-6 6m0-6l6 6" strokeWidth="1.6" strokeLinecap="round"/></svg>,
};

/* ══════════════════════════════════════════════
   ANA BİLEŞEN
   ══════════════════════════════════════════════ */
export default function VoiceRoomContent({ onLeave, channelId }) {
  const connState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const media = useMedia();
  const [showQuality, setShowQuality] = useState(false);
  const [menu, setMenu] = useState(null);
  const [scrError, setScrError] = useState(null);
  const [focusedKey, setFocusedKey] = useState(null);

  const room = useRoomContext();
  const micOn = media.micEnabled;
  const deaf = media.deafened;

  // Kanal ve sunucu bilgisini çek
  const [voiceInfo, setVoiceInfo] = useState(null);
  useEffect(() => {
    if (!channelId) return;
    let alive = true;
    (async () => {
      try {
        const ch = await serverApi.getChannel(channelId);
        if (!alive) return;
        if (ch.serverId) {
          const sv = await serverApi.get(ch.serverId);
          if (!alive) return;
          setVoiceInfo({ channelName: ch.title, serverName: sv.name, serverIcon: sv.iconUrl });
        } else {
          setVoiceInfo({ channelName: ch.title || "Sesli Arama", serverName: null, serverIcon: null });
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [channelId]);

  // Yeni katılımcı geldiğinde zorla tile yenileme tetikle
  const [participantTick, setParticipantTick] = useState(0);
  useEffect(() => {
    if (!room) return;
    const bump = () => setParticipantTick(n => n + 1);
    room.on(RoomEvent.ParticipantConnected, bump);
    room.on(RoomEvent.ParticipantDisconnected, bump);
    room.on(RoomEvent.TrackSubscribed, bump);
    room.on(RoomEvent.TrackUnsubscribed, bump);
    room.on(RoomEvent.TrackMuted, bump);
    room.on(RoomEvent.TrackUnmuted, bump);
    return () => {
      room.off(RoomEvent.ParticipantConnected, bump);
      room.off(RoomEvent.ParticipantDisconnected, bump);
      room.off(RoomEvent.TrackSubscribed, bump);
      room.off(RoomEvent.TrackUnsubscribed, bump);
      room.off(RoomEvent.TrackMuted, bump);
      room.off(RoomEvent.TrackUnmuted, bump);
    };
  }, [room]);

  // Reactive track listesi
  const camTracks = useTracks([Track.Source.Camera]);
  const scrTracks = useTracks([Track.Source.ScreenShare]);
  const scrAudioTracks = useTracks([Track.Source.ScreenShareAudio]);

  const myId = localParticipant?.identity;
  const camOn = camTracks.some((t) => t.participant?.identity === myId);
  const scrOn = scrTracks.some((t) => t.participant?.identity === myId);
  const myScrAudio = scrAudioTracks.find((t) => t.participant?.identity === myId);
  const [scrAudioMuted, setScrAudioMuted] = useState(false);

  // Kamera → katılımcı eşleştirme (muted track'leri hariç tut)
  const camMap = useMemo(() => {
    const m = {};
    camTracks.forEach((t) => {
      if (!t.participant) return;
      const pub = t.participant.getTrackPublication(Track.Source.Camera);
      if (pub && !pub.isMuted) m[t.participant.identity] = t;
    });
    return m;
  }, [camTracks, participantTick]);

  // Ekran paylaşımı → identity eşleştirme
  const scrMap = useMemo(() => {
    const m = {};
    scrTracks.forEach((t) => { if (t.participant) m[t.participant.identity] = t; });
    return m;
  }, [scrTracks]);

  // Tile listesi: her katılımcı + her ekran paylaşımı ayrı kart
  // Boş identity'li phantom katılımcıları filtrele
  const tiles = useMemo(() => {
    const list = [];
    participants.forEach((p) => {
      if (!p.identity) return; // ghost/phantom katılımcıyı atla
      list.push({ key: `p:${p.identity}`, type: "participant", participant: p });
    });
    scrTracks.forEach((t) => {
      const id = t.participant?.identity || "unknown";
      list.push({ key: `s:${id}`, type: "screen", track: t, identity: id });
    });
    return list;
  }, [participants, scrTracks, participantTick]);

  // focusedKey geçerli bir tile değilse sıfırla
  useEffect(() => {
    if (focusedKey && !tiles.some((t) => t.key === focusedKey)) setFocusedKey(null);
  }, [tiles, focusedKey]);

  const connected = connState === ConnectionState.Connected;

  // Spotlight layout: focusedTile büyük, diğerleri küçük alt satır
  const focusedTile = focusedKey ? tiles.find((t) => t.key === focusedKey) : null;
  const otherTiles = focusedKey ? tiles.filter((t) => t.key !== focusedKey) : tiles;
  const gridCols = otherTiles.length <= 1 ? 1 : otherTiles.length <= 2 ? 2 : otherTiles.length <= 4 ? 2 : 4;

  // Kontroller
  const isPTT = media.inputMode === "ptt";
  const doMic = () => {
    if (isPTT) return; // PTT modunda toggle çalışmaz
    media.toggleMic();
  };
  const doDeaf = () => media.toggleDeafen();
  const doCam = async () => {
    if (!localParticipant) return;
    // Kamera açılacaksa izin kontrolü yap
    if (!camOn) {
      try {
        const perm = await navigator.permissions.query({ name: "camera" });
        if (perm.state === "denied") {
          toast.error("Kamera izni engellendi. Lütfen tarayıcının adres çubuğundaki kamera/kilit simgesine tıklayarak izni sıfırlayın ve tekrar deneyin.");
          return;
        }
      } catch { /* permissions API desteklenmiyorsa devam et */ }
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
    try { await localParticipant.setCameraEnabled(!camOn); }
    catch (e) { console.error("Cam:", e); }
  };
  const doScreen = async () => {
    if (!localParticipant) return;
    setScrError(null);
    try {
      if (scrOn) {
        await localParticipant.setScreenShareEnabled(false);
        setScrAudioMuted(false);
      } else {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          selfBrowserSurface: "include",
          systemAudio: "include",
          surfaceSwitching: "include",
        });
        setScrAudioMuted(false);
      }
    } catch (e) {
      console.error("Screen share:", e);
      setScrError(e.message || "Ekran paylaşımı başlatılamadı");
      setTimeout(() => setScrError(null), 5000);
    }
  };
  const doToggleScrAudio = () => {
    if (!myScrAudio?.publication?.track) return;
    const next = !scrAudioMuted;
    if (next) {
      myScrAudio.publication.track.mute();
    } else {
      myScrAudio.publication.track.unmute();
    }
    setScrAudioMuted(next);
  };

  return (
    <div className="h-full w-full flex flex-col bg-surface-1">
      {/* Başlık */}
      <div className="shrink-0 px-3 py-2 border-b border-white/5 flex items-center gap-1.5 overflow-hidden">
        {voiceInfo?.serverName && (
          <>
            {voiceInfo.serverIcon ? (
              <img src={voiceInfo.serverIcon} alt="" className="w-5 h-5 rounded-[22%] object-cover shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-[22%] bg-surface-5 grid place-items-center text-[9px] text-gray-400 shrink-0">
                {voiceInfo.serverName?.[0]?.toUpperCase()}
              </span>
            )}
            <span className="text-[12px] text-gray-400 truncate">{voiceInfo.serverName}</span>
            <svg viewBox="0 0 6 10" className="w-1.5 h-2.5 text-gray-600 shrink-0"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
          </>
        )}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${connected ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
        <span className={`text-xs font-medium truncate ${connected ? "text-emerald-400" : "text-yellow-400"}`}>
          {voiceInfo?.channelName || "Ses Kanalı"} {!connected && `(${connState})`}
        </span>
        <span className="text-[10px] text-gray-500 shrink-0">({participants.length})</span>
        {scrTracks.length > 0 && (
          <span className="text-[10px] text-purple-400 shrink-0">{scrTracks.length} ekran</span>
        )}
      </div>

      {/* Hata mesajı */}
      {scrError && (
        <div className="shrink-0 px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-sm text-red-300">
          {scrError}
        </div>
      )}

      {/* Tile alanı — Spotlight layout */}
      <div className="flex-1 min-h-0 overflow-auto p-4 flex flex-col items-center">
        {/* Spotlight (büyük) */}
        {focusedTile && (
          <div
            className="w-full mb-3 cursor-pointer select-none"
            style={{ maxWidth: 960, flex: "1 1 0", minHeight: 0 }}
            onClick={() => setFocusedKey(null)}
          >
            {focusedTile.type === "participant" && (
              <div className="h-full">
                <ParticipantTile
                  participant={focusedTile.participant}
                  isLocal={focusedTile.participant.identity === myId}
                  micOn={micOn}
                  camTrack={camMap[focusedTile.participant.identity]}
                  onMenu={setMenu}
                  large
                />
              </div>
            )}
            {focusedTile.type === "screen" && (
              <div className="h-full">
                <ScreenTile track={focusedTile.track} isMine={focusedTile.identity === myId} large />
              </div>
            )}
          </div>
        )}
        {/* Diğer katılımcılar (küçük satır veya normal grid) */}
        <div
          className={`grid gap-3 w-full ${focusedKey ? "shrink-0" : "flex-1"}`}
          style={{
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            maxWidth: 960,
            ...(focusedKey ? { maxHeight: 140 } : {}),
          }}
        >
          {otherTiles.map((tile) => (
            <div
              key={tile.key}
              className="select-none cursor-pointer"
              onClick={() => setFocusedKey(tile.key)}
            >
              {tile.type === "participant" && (
                <ParticipantTile
                  participant={tile.participant}
                  isLocal={tile.participant.identity === myId}
                  micOn={micOn}
                  camTrack={camMap[tile.participant.identity]}
                  onMenu={setMenu}
                />
              )}
              {tile.type === "screen" && (
                <ScreenTile track={tile.track} isMine={tile.identity === myId} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Kontroller */}
      <div className="shrink-0 px-2 py-2 bg-surface-0 border-t border-white/5 overflow-x-auto">
        <div className="flex items-center justify-center gap-1.5 flex-wrap relative">
          <div className="flex items-center">
            <Btn
              on={micOn}
              cls={isPTT ? "bg-amber-600/20 text-amber-300 border border-amber-500/30" : "bg-surface-3 text-white hover:bg-surface-5"}
              offCls={isPTT ? "bg-surface-3 text-gray-500 border border-border-light" : "bg-red-500 text-white hover:bg-red-600"}
              click={doMic}
              tip={isPTT ? "Bas-Konuş modu aktif" : micOn ? "Mikrofonu kapat" : "Mikrofonu aç"}
            >
              {micOn ? I.micOn : I.micOff}
            </Btn>
            <DeviceDropdown kind="audioinput" participant={localParticipant} />
          </div>
          <div className="flex items-center">
            <Btn on={!deaf} cls="bg-surface-3 text-white hover:bg-surface-5" offCls="bg-red-500 text-white hover:bg-red-600" click={doDeaf} tip={deaf ? "Sesi aç" : "Sesi kapat"}>
              {deaf ? I.deafOn : I.deafOff}
            </Btn>
            <DeviceDropdown kind="audiooutput" />
          </div>
          <div className="w-px h-6 bg-white/10" />
          <Btn on={camOn} cls="bg-surface-3 text-white hover:bg-surface-5" offCls="bg-surface-3 text-gray-400 hover:bg-surface-5 hover:text-white" click={doCam} tip={camOn ? "Kamerayı kapat" : "Kamerayı aç"}>
            {camOn ? I.camOn : I.camOff}
          </Btn>
          <Btn on={!scrOn} cls="bg-surface-3 text-gray-400 hover:bg-surface-5 hover:text-white" offCls="bg-red-500 text-white hover:bg-red-600" click={doScreen} tip={scrOn ? "Paylaşımı durdur" : "Ekran paylaş"}>
            {I.screen}
          </Btn>
          {scrOn && myScrAudio && (
            <Btn on={!scrAudioMuted} cls="bg-surface-3 text-emerald-400 hover:bg-surface-5" offCls="bg-red-500 text-white hover:bg-red-600" click={doToggleScrAudio} tip={scrAudioMuted ? "Sistem sesini aç" : "Sistem sesini kapat"}>
              {scrAudioMuted ? I.volOff : I.volOn}
            </Btn>
          )}
          <Btn on={showQuality} cls="bg-blue-500 text-white" offCls="bg-surface-3 text-gray-400 hover:bg-surface-5 hover:text-white" click={() => setShowQuality(!showQuality)} tip="Ayarlar">
            {I.settings}
          </Btn>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={onLeave} className="h-9 px-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition flex items-center gap-1.5 whitespace-nowrap">
            {I.leave} Ayrıl
          </button>
          {showQuality && <QualitySettings localParticipant={localParticipant} onClose={() => setShowQuality(false)} />}
        </div>
      </div>

      {menu && <ParticipantVolumeMenu identity={menu.identity} name={menu.name} avatarUrl={menu.avatarUrl} isLocal={menu.isLocal} channelId={channelId} position={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />}
    </div>
  );
}

function Btn({ on, cls, offCls, click, tip, children }) {
  return <button onClick={click} title={tip} className={`w-9 h-9 rounded-xl grid place-items-center transition shrink-0 ${on ? cls : offCls}`}>{children}</button>;
}

/* ── Cihaz seçici dropdown (mik/kulaklık yanı) — portal ile body'ye render ── */
function DeviceDropdown({ kind, participant }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [activeId, setActiveId] = useState("");
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    // Pozisyon hesapla
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top - 8, left: r.left });
    }
    (async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter(d => d.kind === kind));
        if (kind === "audioinput" && participant) {
          const pub = participant.getTrackPublication(Track.Source.Microphone);
          const settings = pub?.track?.mediaStreamTrack?.getSettings();
          if (settings?.deviceId) setActiveId(settings.deviceId);
        }
      } catch {}
    })();
  }, [open, kind, participant]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectDevice = async (deviceId) => {
    try {
      if (kind === "audioinput" && participant) {
        await participant.switchActiveDevice("audioinput", deviceId);
      } else if (kind === "audiooutput") {
        document.querySelectorAll("audio").forEach(el => {
          if (typeof el.setSinkId === "function") el.setSinkId(deviceId).catch(() => {});
        });
      }
      setActiveId(deviceId);
    } catch (e) { console.error("Device switch error:", e); }
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="w-4 h-9 rounded-r-xl -ml-1.5 grid place-items-center bg-surface-3 hover:bg-surface-5 text-gray-500 hover:text-gray-300 transition border-l border-white/5"
        title={kind === "audioinput" ? "Mikrofon seç" : "Hoparlör seç"}
      >
        <svg viewBox="0 0 10 6" className="w-2 h-2" fill="currentColor"><path d="M0 0l5 5 5-5z"/></svg>
      </button>
      {open && createPortal(
        <div ref={menuRef}
          style={{ position: "fixed", bottom: window.innerHeight - pos.top, left: pos.left, zIndex: 99999 }}
          className="w-56 bg-surface-2 border border-border-light rounded-xl shadow-2xl shadow-black/40 py-1 mb-2">
          <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase">
            {kind === "audioinput" ? "Mikrofon" : "Hoparlör"}
          </div>
          {devices.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">Cihaz bulunamadı</div>
          )}
          {devices.map(d => (
            <button
              key={d.deviceId}
              onClick={() => selectDevice(d.deviceId)}
              className={`w-full text-left px-3 py-2 text-xs transition hover:bg-surface-5 flex items-center gap-2 ${
                activeId === d.deviceId ? "text-accent-light" : "text-gray-300"
              }`}
            >
              {activeId === d.deviceId && (
                <svg viewBox="0 0 16 16" className="w-3 h-3 text-accent shrink-0"><path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
              )}
              <span className="truncate">{d.label || `Cihaz ${d.deviceId.slice(0, 8)}`}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
