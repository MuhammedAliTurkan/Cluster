import { createContext, useContext, useRef, useState, useCallback } from "react";

const MediaContext = createContext(null);

export function MediaProvider({ children }) {
  const participantRef = useRef(null);
  const intentionalLeaveRef = useRef(false);
  const [inCall, setInCall] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [channelId, setChannelId] = useState(null);

  // Kalıcı ses bağlantısı
  const [voiceState, setVoiceState] = useState(null); // { token, wsUrl, channelId }

  // Katılımcı ses seviyeleri { [identity]: number (0-200) }
  const [participantVolumes, setParticipantVolumes] = useState({});

  // Katılımcı durumları (mic, deafen vb.) { [identity]: { micMuted, speaking } }
  const [voiceParticipantStates, setVoiceParticipantStates] = useState({});

  // Ekran paylaşımı aktif mi (PiP için)
  const [screenShareActive, setScreenShareActive] = useState(false);

  // F5 sonrası otomatik yeniden bağlanma için bekleyen kanal
  const [pendingVoiceChannelId] = useState(() => {
    const saved = localStorage.getItem("cl-voiceChannelId");
    // Bir kez oku, sonra sil — VoiceChannel kullanacak
    if (saved) localStorage.removeItem("cl-voiceChannelId");
    return saved;
  });

  const startVoice = useCallback((token, wsUrl, chId) => {

    intentionalLeaveRef.current = false;
    setVoiceState({ token, wsUrl, channelId: chId });
    // F5 sonrası otomatik yeniden bağlanmak için kaydet
    localStorage.setItem("cl-voiceChannelId", chId);
  }, []);

  const clearVoice = useCallback(() => {

    setVoiceState(null);
    setInCall(false);
    setDeafened(false);
    setChannelId(null);
    setParticipantVolumes({});
    setVoiceParticipantStates({});
    setScreenShareActive(false);
    participantRef.current = null;
  }, []);

  const registerParticipant = useCallback((lp, chId) => {
    participantRef.current = lp;
    intentionalLeaveRef.current = false;
    setInCall(true);
    setChannelId(chId || null);
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
    setVoiceState(null);
    setInCall(false);
    setDeafened(false);
    setChannelId(null);
    setParticipantVolumes({});
    setVoiceParticipantStates({});
    setScreenShareActive(false);
    participantRef.current = null;
    // F5 sonrası tekrar bağlanmasın
    localStorage.removeItem("cl-voiceChannelId");
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
        if (!prev[k] || prev[k].micMuted !== states[k].micMuted || prev[k].name !== states[k].name) {
          return states;
        }
      }
      return prev; // değişiklik yok, aynı referans döndür
    });
  }, []);

  return (
    <MediaContext.Provider value={{
      inCall, deafened, micEnabled, channelId, voiceState, pendingVoiceChannelId,
      intentionalLeaveRef,
      participantVolumes, voiceParticipantStates, screenShareActive,
      registerParticipant, unregisterParticipant,
      syncMic, toggleMic, toggleDeafen,
      leaveCall, startVoice, clearVoice,
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
