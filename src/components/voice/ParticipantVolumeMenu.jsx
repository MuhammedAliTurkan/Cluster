import { useEffect, useRef } from "react";
import { useMedia } from "../../context/MediaContext";
import Avatar from "../common/Avatar";

/**
 * Katılımcı ses seviyesi popup menüsü.
 * Hem ses UI'ında hem sidebar'da kullanılır.
 *
 * @param {string} identity - Katılımcı kimliği
 * @param {string} name - Görünen isim
 * @param {string} avatarUrl - Avatar URL
 * @param {{ x: number, y: number }} position - Ekran pozisyonu
 * @param {boolean} isLocal - Kendimiz mi
 * @param {() => void} onClose
 */
export default function ParticipantVolumeMenu({ identity, name, avatarUrl, position, isLocal, onClose }) {
  const media = useMedia();
  const ref = useRef(null);
  const volume = media.participantVolumes[identity] ?? 100;

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Menünün ekran dışına çıkmasını engelle
  const style = {
    position: "fixed",
    zIndex: 9999,
    left: Math.min(position.x, window.innerWidth - 260),
    top: Math.min(position.y, window.innerHeight - 200),
  };

  const handleVolumeChange = (e) => {
    media.setParticipantVolume(identity, Number(e.target.value));
  };

  const handleLocalMute = () => {
    media.setParticipantVolume(identity, volume === 0 ? 100 : 0);
  };

  return (
    <div ref={ref} style={style} className="w-60 bg-[#1e1f22] border border-[#3a3d43] rounded-xl shadow-2xl overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <Avatar src={avatarUrl} name={name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">{name}</div>
          <div className="text-[10px] text-gray-500">{isLocal ? "Sen" : "Katılımcı"}</div>
        </div>
      </div>

      {/* Ses seviyesi slider — kendimize gösterilmez */}
      {!isLocal && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Ses Seviyesi</span>
            <span className="text-xs text-white font-medium">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 rounded-full appearance-none bg-[#4e4f56] cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          />
          <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
            <span>0%</span>
            <span>200%</span>
          </div>

          {/* Sustur butonu */}
          <button
            onClick={handleLocalMute}
            className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition ${
              volume === 0
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {volume === 0 ? "Sesi Aç" : "Sustur"}
          </button>
        </div>
      )}

      {isLocal && (
        <div className="px-4 py-3 text-xs text-gray-500 text-center">
          Kendi ses seviyenizi değiştiremezsiniz
        </div>
      )}
    </div>
  );
}
