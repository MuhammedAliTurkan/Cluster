import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchLiveKitToken } from "../../services/livekitApi";
import { useMedia } from "../../context/MediaContext";
import { useChat } from "../../context/ChatContext";

/**
 * Ses kanalı sayfası.
 * Token alıp MediaContext'e kaydeder.
 * Asıl LiveKitRoom, PersistentVoice bileşeninde kalıcı olarak render edilir.
 */
export default function VoiceChannel() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "audio";
  const source = searchParams.get("source"); // "dm" | "server" | null
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const media = useMedia();
  const { activeServerId } = useChat();

  // Kaynak belirleme: URL param > sunucu kontrolü
  const resolvedSource = source || (activeServerId ? "server" : "dm");

  useEffect(() => {
    if (!channelId) { setError("channelId bulunamadı"); return; }

    // Zaten bu kanala bağlıysa tekrar token alma
    if (media.voiceState?.channelId === channelId) {
      return;
    }

    // Başka bir sesli kanala bağlıysa önce çıkart
    if (media.voiceState) {
      media.leaveCall();
    }

    let alive = true;
    (async () => {
      try {
        const data = await fetchLiveKitToken(channelId, mode);
        if (!alive) return;
        media.startVoice(data.token, data.wsUrl, channelId, resolvedSource);
      } catch (err) {
        if (!alive) return;
        console.error("LiveKit token fetch error:", err);
        setError(err?.response?.data?.message || err.message || "Token alınamadı");
      }
    })();
    return () => { alive = false; };
  }, [channelId, mode]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1">
        <div className="text-center space-y-4">
          <div className="text-red-400">{error}</div>
          <button onClick={() => navigate("/app/friends", { replace: true })}
            className="px-4 py-2 bg-surface-3 rounded-lg hover:bg-surface-5 text-white">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (!media.voiceState) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-gray-400">Ses kanalına bağlanılıyor...</span>
        </div>
      </div>
    );
  }

  // PersistentVoice bileşeni tam ekran overlay olarak UI'ı gösterir
  return null;
}
