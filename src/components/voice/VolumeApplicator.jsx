import { useEffect } from "react";
import { useParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMedia } from "../../context/MediaContext";

/**
 * LiveKitRoom içinde render edilir.
 * MediaContext.participantVolumes değiştiğinde
 * her katılımcının ses seviyesini uygular.
 */
export default function VolumeApplicator() {
  const participants = useParticipants();
  const { participantVolumes } = useMedia();

  useEffect(() => {
    for (const p of participants) {
      const vol = participantVolumes[p.identity];
      if (vol === undefined) continue; // ayarlanmamış — varsayılan

      const audioPub = p.getTrackPublication(Track.Source.Microphone);
      if (audioPub?.track && typeof audioPub.track.setVolume === "function") {
        // LiveKit volume: 0.0 - 1.0 (biz 0-200 aralığı kullanıyoruz)
        audioPub.track.setVolume(vol / 100);
      }
    }
  }, [participants, participantVolumes]);

  return null;
}
