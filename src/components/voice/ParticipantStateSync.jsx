import { useEffect, useRef } from "react";
import { useParticipants, useTracks } from "@livekit/components-react";
import { Track, ParticipantEvent } from "livekit-client";
import { useMedia } from "../../context/MediaContext";
import { sounds } from "../../utils/sounds";

/**
 * LiveKitRoom içinde render edilir.
 * Tüm katılımcıların mic/deafen/screenShare durumlarını
 * MediaContext'e senkronize eder (sidebar vb. için).
 */
export default function ParticipantStateSync() {
  const participants = useParticipants();
  const { updateParticipantStates, setScreenShareActive, channelId: mediaChannelId } = useMedia();
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  // Stabil referansları ref'te tut — böylece effect'ler yeniden tetiklenmez
  const updateRef = useRef(updateParticipantStates);
  updateRef.current = updateParticipantStates;
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  // Katılımcı join/leave sesleri + sidebar'a anlık bildirim
  const prevCountRef = useRef(participants.length);
  const mountedRef = useRef(false);
  useEffect(() => {
    // Debug: ghost participant tespiti
    const ghosts = participants.filter((p) => !p.identity || !p.name);
    if (ghosts.length > 0) {
      console.warn("[ParticipantStateSync] Ghost participants detected:", ghosts.map(p => ({
        identity: p.identity, name: p.name, sid: p.sid, metadata: p.metadata
      })));
    }

    const prev = prevCountRef.current;
    const curr = participants.length;
    prevCountRef.current = curr;

    if (!mountedRef.current) {
      mountedRef.current = true;
      sounds.join();
    } else if (prev !== curr) {
      if (curr > prev) sounds.join();
      else sounds.leave();
    }

    // Sidebar'a anlık katılımcı listesi gönder (webhook gecikmesini bypass)
    const channelId = mediaChannelId;
    if (channelId) {
      const list = participants
        .filter((p) => p.identity) // ghost/phantom katılımcıları filtrele
        .map((p) => ({
          identity: p.identity,
          name: p.name || p.identity,
        }));
      window.dispatchEvent(new CustomEvent("voice-participants-changed", {
        detail: { channelId, participants: list },
      }));
    }
  }, [participants.length, mediaChannelId]);

  // Ekran paylaşımı durumunu sync
  useEffect(() => {
    setScreenShareActive(screenTracks.length > 0);
  }, [screenTracks.length, setScreenShareActive]);

  // Katılımcı durumlarını sync
  useEffect(() => {
    const sync = () => {
      const states = {};
      for (const p of participantsRef.current) {
        const micPub = p.getTrackPublication(Track.Source.Microphone);
        states[p.identity] = {
          micMuted: !micPub || micPub.isMuted,
          speaking: p.isSpeaking,
          name: p.name || p.identity,
        };
      }
      updateRef.current(states);
    };

    sync();

    const events = [
      ParticipantEvent.TrackMuted,
      ParticipantEvent.TrackUnmuted,
      ParticipantEvent.TrackPublished,
      ParticipantEvent.TrackUnpublished,
      ParticipantEvent.LocalTrackPublished,
      ParticipantEvent.LocalTrackUnpublished,
      ParticipantEvent.IsSpeakingChanged,
    ];

    for (const p of participants) {
      events.forEach((e) => p.on(e, sync));
    }

    return () => {
      for (const p of participants) {
        events.forEach((e) => p.off(e, sync));
      }
    };
  }, [participants]);

  return null;
}
