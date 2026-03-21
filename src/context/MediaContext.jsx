import { createContext, useContext, useRef, useState, useCallback } from "react";
import { pauseBgMusicForVoice, resumeBgMusicFromVoice } from "../hooks/useBgMusic";

const MediaContext = createContext(null);

export function MediaProvider({ children }) {
  const participantRef = useRef(null);
  const intentionalLeaveRef = useRef(false);
  const [inCall, setInCall] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [channelId, setChannelId] = useState(null);

  // Ses giriş modu: "voice" (ses aktivitesi) veya "ptt" (bas-konuş)
  const [inputMode, setInputMode] = useState(() => localStorage.getItem("cl-input-mode") || "voice");

  // Kalıcı ses bağlantısı
  const [voiceState, setVoiceState] = useState(null); // { token, wsUrl, channelId }
  const [voiceSource, setVoiceSource] = useState(null); // "dm" | "server"

  // Katılımcı ses seviyeleri { [identity]: number (0-200) }
  const [participantVolumes, setParticipantVolumes] = useState({});

  // Katılımcı durumları (mic, deafen vb.) { [identity]: { micMuted, speaking } }
  const [voiceParticipantStates, setVoiceParticipantStates] = useState({});

  // Ekran paylaşımı aktif mi (PiP için)
  const [screenShareActive, setScreenShareActive] = useState(false);

  // Bağlantı kopan oda bilgisi (geri dönme bildirimi için)
  // { channelId, source, timestamp }
  const [disconnectedRoom, setDisconnectedRoom] = useState(null);

  // Bağlantı durumu: { state: "connecting"|"connected"|"reconnecting"|"disconnected", ping: number|null }
  const [connectionInfo, setConnectionInfo] = useState({ state: "disconnected", ping: null });

  // F5 sonrası otomatik yeniden bağlanma için bekleyen kanal
  const [pendingVoiceChannelId] = useState(() => {
    const saved = localStorage.getItem("cl-voiceChannelId");
    // Bir kez oku, sonra sil — VoiceChannel kullanacak
    if (saved) localStorage.removeItem("cl-voiceChannelId");
    return saved;
  });
  // F5 sonrası voiceSource restore
  const [pendingVoiceSource] = useState(() => {
    const saved = localStorage.getItem("cl-voiceSource");
    if (saved) setVoiceSource(saved);
    return saved;
  });

  const startVoice = useCallback((token, wsUrl, chId, source) => {
    intentionalLeaveRef.current = false;
    pauseBgMusicForVoice();
    setVoiceState({ token, wsUrl, channelId: chId });
    // Yeni odaya bağlanınca reconnect banner'ı kapat
    setDisconnectedRoom(null);
    if (source) {
      setVoiceSource(source);
      localStorage.setItem("cl-voiceSource", source);
    }
    // F5 sonrası otomatik yeniden bağlanmak için kaydet
    localStorage.setItem("cl-voiceChannelId", chId);
  }, []);

  const clearVoice = useCallback(() => {
    resumeBgMusicFromVoice();
    setVoiceState(null);
    setVoiceSource(null);
    setInCall(false);
    setDeafened(false);
    setChannelId(null);
    setParticipantVolumes({});
    setVoiceParticipantStates({});
    setScreenShareActive(false);
    setConnectionInfo({ state: "disconnected", ping: null });
    participantRef.current = null;
  }, []);

  /** Bağlantı beklenmedik şekilde koptuğunda çağrılır (sunucu/ağ hatası) */
  const handleUnexpectedDisconnect = useCallback(() => {
    const chId = channelId || voiceState?.channelId;
    const src = voiceSource;
    // State temizle
    setVoiceState(null);
    setInCall(false);
    setDeafened(false);
    setChannelId(null);
    setParticipantVolumes({});
    setVoiceParticipantStates({});
    setScreenShareActive(false);
    participantRef.current = null;
    localStorage.removeItem("cl-voiceChannelId");
    localStorage.removeItem("cl-voiceSource");
    // Geri dönme bildirimi için oda bilgisini sakla (60 saniye geçerli)
    if (chId) {
      setDisconnectedRoom({ channelId: chId, source: src, timestamp: Date.now() });
    }
  }, [channelId, voiceState, voiceSource]);

  const registerParticipant = useCallback((lp, chId) => {
    participantRef.current = lp;
    intentionalLeaveRef.current = false;
    setInCall(true);
    setChannelId(chId || null);
    // PTT modunda mic kapalı başlar
    const mode = localStorage.getItem("cl-input-mode") || "voice";
    if (mode === "ptt") {
      lp.setMicrophoneEnabled(false).catch(() => {});
      setMicEnabled(false);
    }
  }, []);

  const unregisterParticipant = useCallback(() => {
    participantRef.current = null;
    setInCall(false);
    setDeafened(false);
    setChannelId(null);
  }, []);

  const syncMic = useCallback((enabled) => {
    setMicEnabled(enabled);
  }, []);

  const toggleMic = useCallback(async () => {
    const lp = participantRef.current;
    if (!lp) return;
    try {
      const next = !micEnabled;
      await lp.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch (e) { console.error("Mic toggle:", e); }
  }, [micEnabled]);

  /** Ses giriş modunu değiştir */
  const changeInputMode = useCallback(async (mode) => {
    setInputMode(mode);
    localStorage.setItem("cl-input-mode", mode);
    const lp = participantRef.current;
    if (lp && inCall) {
      if (mode === "ptt") {
        // PTT moduna geçince mic kapat
        await lp.setMicrophoneEnabled(false).catch(() => {});
        setMicEnabled(false);
      } else {
        // Ses aktivitesine geçince mic aç
        await lp.setMicrophoneEnabled(true).catch(() => {});
        setMicEnabled(true);
      }
    }
  }, [inCall]);

  /** Doğrudan mic durumu ayarla (push-to-talk için) */
  const setMic = useCallback(async (enabled) => {
    const lp = participantRef.current;
    if (!lp) return;
    try {
      await lp.setMicrophoneEnabled(enabled);
      setMicEnabled(enabled);
    } catch (e) { console.error("Mic set:", e); }
  }, []);

  const toggleDeafen = useCallback(async () => {
    const lp = participantRef.current;
    if (!lp) return;
    setDeafened((prev) => {
      const next = !prev;
      if (next) {
        lp.setMicrophoneEnabled(false);
        setMicEnabled(false);
      }
      return next;
    });
  }, []);

  const leaveCall = useCallback(() => {
    intentionalLeaveRef.current = true;
    resumeBgMusicFromVoice();
    setVoiceState(null);
    setVoiceSource(null);
    setInCall(false);
    setDeafened(false);
    setChannelId(null);
    setParticipantVolumes({});
    setVoiceParticipantStates({});
    setScreenShareActive(false);
    setConnectionInfo({ state: "disconnected", ping: null });
    participantRef.current = null;
    // F5 sonrası tekrar bağlanmasın
    localStorage.removeItem("cl-voiceChannelId");
    localStorage.removeItem("cl-voiceSource");
  }, []);

  /** Bir katılımcının ses seviyesini ayarla (0-200, varsayılan 100) */
  const setParticipantVolume = useCallback((identity, volume) => {
    setParticipantVolumes((prev) => ({ ...prev, [identity]: volume }));
  }, []);

  /** Tüm katılımcı durumlarını güncelle (shallow compare ile gereksiz re-render önle) */
  const updateParticipantStates = useCallback((states) => {
    setVoiceParticipantStates((prev) => {
      const keys = Object.keys(states);
      const prevKeys = Object.keys(prev);
      if (keys.length !== prevKeys.length) return states;
      for (const k of keys) {
        if (!prev[k] || prev[k].micMuted !== states[k].micMuted || prev[k].speaking !== states[k].speaking || prev[k].name !== states[k].name) {
          return states;
        }
      }
      return prev; // değişiklik yok, aynı referans döndür
    });
  }, []);

  return (
    <MediaContext.Provider value={{
      inCall, deafened, micEnabled, channelId, voiceState, voiceSource, pendingVoiceChannelId,
      intentionalLeaveRef, inputMode,
      participantVolumes, voiceParticipantStates, screenShareActive,
      disconnectedRoom, setDisconnectedRoom,
      connectionInfo, setConnectionInfo,
      registerParticipant, unregisterParticipant,
      syncMic, toggleMic, setMic, toggleDeafen, changeInputMode,
      leaveCall, startVoice, clearVoice, handleUnexpectedDisconnect,
      setParticipantVolume, updateParticipantStates, setScreenShareActive,
    }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error("useMedia must be used within MediaProvider");
  return ctx;
}
