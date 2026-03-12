import { useEffect, useRef } from "react";
import { useParticipants, useTracks } from "@livekit/components-react";
import { Track, ParticipantEvent } from "livekit-client";
import { useMedia } from "../../context/MediaContext";

/**
 * LiveKitRoom içinde render edilir.
 * Tüm katılımcıların mic/deafen/screenShare durumlarını
 * MediaContext'e senkronize eder (sidebar vb. için).
 */
export default function ParticipantStateSync() {
  const participants = useParticipants();
  const { updateParticipantStates, setScreenShareActive } = useMedia();
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  // Stabil referansları ref'te tut — böylece effect'ler yeniden tetiklenmez
  const updateRef = useRef(updateParticipantStates);
  updateRef.current = updateParticipantStates;
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

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
