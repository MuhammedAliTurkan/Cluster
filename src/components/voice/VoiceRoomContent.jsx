import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  useParticipantInfo,
  useTracks,
  VideoTrack,
  useConnectionState,
} from "@livekit/components-react";
import { Track, ParticipantEvent, ConnectionState } from "livekit-client";
import QualitySettings from "../media/QualitySettings";
import Avatar from "../common/Avatar";
import { useMedia } from "../../context/MediaContext";
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
function ParticipantTile({ participant, isLocal, micOn, camTrack, onMenu }) {
  const speaking = useIsSpeaking(participant);
  const { name, identity } = useParticipantInfo({ participant });
  const label = name || identity || "?";
  const avatar = useAvatar(participant);
  const remoteMuted = useMicMuted(participant);
  const muted = isLocal ? !micOn : remoteMuted;

  return (
    <div
      onClick={(e) => onMenu?.({ identity, name: label, avatarUrl: avatar, isLocal, x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => { e.preventDefault(); onMenu?.({ identity, name: label, avatarUrl: avatar, isLocal, x: e.clientX, y: e.clientY }); }}
      className={`relative rounded-xl overflow-hidden cursor-pointer bg-[#1a1a24] flex flex-col
        ${speaking ? "ring-2 ring-emerald-500" : "ring-1 ring-white/10"}`}
    >
      {/* İçerik */}
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: 100 }}>
        {camTrack ? (
          <VideoTrack trackRef={camTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="relative py-4">
            <div className={`rounded-full ${speaking ? "ring-[3px] ring-emerald-500" : ""}`}>
              <Avatar src={avatar} name={label} size={56} />
            </div>
            {muted && <MuteBadge corner />}
            {speaking && !muted && <SpeakDot />}
          </div>
        )}
      </div>
      {/* Alt bar */}
      <div className="px-3 py-1 bg-black/40 flex items-center gap-2">
        {camTrack && <Avatar src={avatar} name={label} size={18} />}
        <span className="text-[11px] text-white truncate flex-1">{label}{isLocal ? " (Sen)" : ""}</span>
        {muted && camTrack && <MuteBadge />}
        {speaking && !muted && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Ekran Paylaşımı Kartı
   ══════════════════════════════════════════════ */
function ScreenTile({ track, isMine }) {
  const [watch, setWatch] = useState(isMine);
  const who = track?.participant?.name || track?.participant?.identity || "Birisi";

  if (!track) return null;

  return (
    <div className="relative rounded-xl overflow-hidden ring-1 ring-purple-500/40 bg-black flex flex-col">
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: 100 }}>
        {watch ? (
          <>
            <VideoTrack trackRef={track} className="w-full h-full object-contain" />
            {!isMine && (
              <button onClick={() => setWatch(false)}
                className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-gray-300 hover:text-white z-10">
                Kapat
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <ScreenSvg size={32} color="#a855f6" />
            <span className="text-[11px] text-gray-400">{who} ekran paylaşıyor</span>
            <button onClick={() => setWatch(true)}
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

  const micOn = media.micEnabled;
  const deaf = media.deafened;

  // Reactive track listesi
  const camTracks = useTracks([Track.Source.Camera]);
  const scrTracks = useTracks([Track.Source.ScreenShare]);


  const myId = localParticipant?.identity;
  const camOn = camTracks.some((t) => t.participant?.identity === myId);
  const scrOn = scrTracks.some((t) => t.participant?.identity === myId);

  // Kamera → katılımcı eşleştirme
  const camMap = useMemo(() => {
    const m = {};
    camTracks.forEach((t) => { if (t.participant) m[t.participant.identity] = t; });
    return m;
  }, [camTracks]);

  // Ekran paylaşımı → identity eşleştirme
  const scrMap = useMemo(() => {
    const m = {};
    scrTracks.forEach((t) => { if (t.participant) m[t.participant.identity] = t; });
    return m;
  }, [scrTracks]);

  // Tile listesi: her katılımcı + her ekran paylaşımı ayrı kart
  const tiles = useMemo(() => {
    const list = [];
    // Önce katılımcılar
    participants.forEach((p) => {
      list.push({ key: `p:${p.identity}`, type: "participant", participant: p });
    });
    // Sonra ekran paylaşımları
    scrTracks.forEach((t) => {
      const id = t.participant?.identity || "unknown";
      list.push({ key: `s:${id}`, type: "screen", track: t, identity: id });
    });
    return list;
  }, [participants, scrTracks]);

  // Sürükle-bırak sıralaması
  const [dragOrder, setDragOrder] = useState([]);
  const dragFrom = useRef(null);
  const dragTo = useRef(null);

  // tiles değiştiğinde sırayı güncelle (mevcut sırayı koru, yenileri sona ekle)
  useEffect(() => {
    const keys = tiles.map((t) => t.key);
    setDragOrder((prev) => {
      const keySet = new Set(keys);
      const kept = prev.filter((k) => keySet.has(k));
      const keptSet = new Set(kept);
      const added = keys.filter((k) => !keptSet.has(k));
      const merged = [...kept, ...added];
      if (merged.length === prev.length && merged.every((v, i) => v === prev[i])) return prev;
      return merged;
    });
  }, [tiles]);

  const handleDragStart = useCallback((i) => { dragFrom.current = i; }, []);
  const handleDragOver = useCallback((e, i) => { e.preventDefault(); dragTo.current = i; }, []);
  const handleDrop = useCallback(() => {
    const f = dragFrom.current, t = dragTo.current;
    dragFrom.current = null; dragTo.current = null;
    if (f == null || t == null || f === t) return;
    setDragOrder((prev) => {
      const n = [...prev];
      const [m] = n.splice(f, 1);
      n.splice(t, 0, m);
      return n;
    });
  }, []);

  // Tile lookup map
  const tileMap = useMemo(() => {
    const m = {};
    tiles.forEach((t) => { m[t.key] = t; });
    return m;
  }, [tiles]);

  // Sıralı tile listesi
  const orderedTiles = useMemo(() => {
    return dragOrder.map((key) => tileMap[key]).filter(Boolean);
  }, [dragOrder, tileMap]);

  // Grid boyutu: 2'nin katları (1→2→4→8→16)
  const n = orderedTiles.length;
  const cols = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 2 : n <= 8 ? 4 : 4;

  const connected = connState === ConnectionState.Connected;

  // Kontroller
  const doMic = () => media.toggleMic();
  const doDeaf = () => media.toggleDeafen();
  const doCam = async () => {
    if (!localParticipant) return;
    try { await localParticipant.setCameraEnabled(!camOn); }
    catch (e) { console.error("Cam:", e); }
  };
  const doScreen = async () => {
    if (!localParticipant) return;
    setScrError(null);
    try {
      await localParticipant.setScreenShareEnabled(!scrOn);
    } catch (e) {
      console.error("Screen share:", e);
      setScrError(e.message || "Ekran paylaşımı başlatılamadı");
      setTimeout(() => setScrError(null), 5000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#111118]">
      {/* Başlık */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
        <span className={`text-sm font-medium ${connected ? "text-emerald-400" : "text-yellow-400"}`}>
          Ses Kanalı {!connected && `(${connState})`}
        </span>
        <span className="text-xs text-gray-500">— {participants.length} katılımcı</span>
        {scrTracks.length > 0 && (
          <span className="text-xs text-purple-400 ml-2">— {scrTracks.length} ekran paylaşımı</span>
        )}
      </div>

      {/* Hata mesajı */}
      {scrError && (
        <div className="shrink-0 px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-sm text-red-300">
          {scrError}
        </div>
      )}

      {/* Tile alanı */}
      <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center">
        <div
          className="grid gap-3 w-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            maxWidth: 960,
          }}
        >
          {orderedTiles.map((tile, idx) => (
            <div
              key={tile.key}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={handleDrop}
              className="select-none"
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
                <ScreenTile
                  track={tile.track}
                  isMine={tile.identity === myId}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Kontroller */}
      <div className="shrink-0 px-4 py-3 bg-[#0a0a12] border-t border-white/5">
        <div className="flex items-center justify-center gap-2 relative">
          <Btn on={micOn} cls="bg-[#2d2d3d] text-white hover:bg-[#3d3d4d]" offCls="bg-red-500 text-white hover:bg-red-600" click={doMic} tip={micOn ? "Mikrofonu kapat" : "Mikrofonu aç"}>
            {micOn ? I.micOn : I.micOff}
          </Btn>
          <Btn on={!deaf} cls="bg-[#2d2d3d] text-white hover:bg-[#3d3d4d]" offCls="bg-red-500 text-white hover:bg-red-600" click={doDeaf} tip={deaf ? "Sesi aç" : "Sesi kapat"}>
            {deaf ? I.deafOn : I.deafOff}
          </Btn>
          <div className="w-px h-7 bg-white/10 mx-1" />
          <Btn on={camOn} cls="bg-[#2d2d3d] text-white hover:bg-[#3d3d4d]" offCls="bg-[#2d2d3d] text-gray-400 hover:bg-[#3d3d4d] hover:text-white" click={doCam} tip={camOn ? "Kamerayı kapat" : "Kamerayı aç"}>
            {camOn ? I.camOn : I.camOff}
          </Btn>
          <Btn on={!scrOn} cls="bg-[#2d2d3d] text-gray-400 hover:bg-[#3d3d4d] hover:text-white" offCls="bg-red-500 text-white hover:bg-red-600" click={doScreen} tip={scrOn ? "Paylaşımı durdur" : "Ekran paylaş"}>
            {I.screen}
          </Btn>
          <Btn on={showQuality} cls="bg-blue-500 text-white" offCls="bg-[#2d2d3d] text-gray-400 hover:bg-[#3d3d4d] hover:text-white" click={() => setShowQuality(!showQuality)} tip="Ayarlar">
            {I.settings}
          </Btn>
          <div className="w-px h-7 bg-white/10 mx-1" />
          <button onClick={onLeave} className="h-11 px-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition flex items-center gap-2">
            {I.leave} Ayrıl
          </button>
          {showQuality && <QualitySettings localParticipant={localParticipant} onClose={() => setShowQuality(false)} />}
        </div>
      </div>

      {menu && <ParticipantVolumeMenu identity={menu.identity} name={menu.name} avatarUrl={menu.avatarUrl} isLocal={menu.isLocal} position={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />}
    </div>
  );
}

function Btn({ on, cls, offCls, click, tip, children }) {
  return <button onClick={click} title={tip} className={`w-11 h-11 rounded-full grid place-items-center transition ${on ? cls : offCls}`}>{children}</button>;
}
