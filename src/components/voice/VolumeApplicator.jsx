import { useEffect, useRef } from "react";
import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMedia } from "../../context/MediaContext";

/**
 * LiveKitRoom içinde render edilir.
 * MediaContext.participantVolumes ve deafened durumuna göre
 * her katılımcının ses seviyesini uygular.
 *
 * %100'e kadar: HTMLMediaElement.volume (0-1)
 * %100 üstü:   Web Audio GainNode ile boost (1-2x)
 */
export default function VolumeApplicator() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const { participantVolumes, deafened } = useMedia();
  // GainNode'ları sakla: { "identity:source": { ctx, gain, sourceNode } }
  const gainNodesRef = useRef({});

  useEffect(() => {
    const myId = localParticipant?.identity;

    for (const p of participants) {
      if (p.identity === myId) continue;

      const vol = participantVolumes[p.identity];
      const level = vol !== undefined ? vol : 100;

      const applyVolume = (pub, sourceKey) => {
        if (!pub?.track) return;
        const track = pub.track;

        if (deafened) {
          // Sağırlaştırma
          if (typeof track.setVolume === "function") track.setVolume(0);
          return;
        }

        if (level <= 100) {
          // Normal aralık: HTMLMediaElement.volume kullan
          if (typeof track.setVolume === "function") {
            track.setVolume(Math.max(level / 100, 0));
          }
          // Varsa GainNode'u temizle
          const existing = gainNodesRef.current[sourceKey];
          if (existing) {
            try { existing.sourceNode?.disconnect(); existing.gain?.disconnect(); } catch {}
            delete gainNodesRef.current[sourceKey];
          }
        } else {
          // %100 üstü: volume=1 + GainNode ile boost
          if (typeof track.setVolume === "function") {
            track.setVolume(1);
          }
          // GainNode oluştur veya güncelle
          try {
            const mediaEl = track.attachedElements?.[0];
            if (!mediaEl) return;

            let entry = gainNodesRef.current[sourceKey];
            if (!entry || entry.mediaEl !== mediaEl) {
              // Eski varsa temizle
              if (entry) {
                try { entry.sourceNode?.disconnect(); entry.gain?.disconnect(); } catch {}
              }
              const ctx = new AudioContext();
              const source = ctx.createMediaElementSource(mediaEl);
              const gain = ctx.createGain();
              source.connect(gain);
              gain.connect(ctx.destination);
              entry = { ctx, gain, sourceNode: source, mediaEl };
              gainNodesRef.current[sourceKey] = entry;
            }
            entry.gain.gain.value = level / 100; // 1.0 - 2.0
          } catch (e) {
            // GainNode oluşturulamazsa sessizce devam et
            console.warn("GainNode error:", e.message);
          }
        }
      };

      applyVolume(p.getTrackPublication(Track.Source.Microphone), `${p.identity}:mic`);
      applyVolume(p.getTrackPublication(Track.Source.ScreenShareAudio), `${p.identity}:scr`);
    }
  }, [participants, participantVolumes, deafened, localParticipant]);

  // Cleanup
  useEffect(() => {
    return () => {
      for (const entry of Object.values(gainNodesRef.current)) {
        try { entry.sourceNode?.disconnect(); entry.gain?.disconnect(); entry.ctx?.close(); } catch {}
      }
      gainNodesRef.current = {};
    };
  }, []);

  return null;
}
