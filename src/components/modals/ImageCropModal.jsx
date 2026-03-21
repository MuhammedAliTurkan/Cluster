import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";

/**
 * Resim kirpma modali.
 * @param {string}   imageSrc   - Data URL veya blob URL
 * @param {number}   aspect     - En/boy orani (1 = kare, 4 = genis banner)
 * @param {string}   title      - Modal basligi
 * @param {number}   outputW    - Cikti genisligi (px)
 * @param {number}   outputH    - Cikti yuksekligi (px)
 * @param {boolean}  round      - Kirpma alani yuvarlak mi
 * @param {function} onDone     - (croppedFile: File) => void
 * @param {function} onCancel   - () => void
 */
export default function ImageCropModal({
  imageSrc, aspect, title, outputW, outputH, round, onDone, onCancel,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    const file = await getCroppedFile(imageSrc, croppedArea, outputW, outputH);
    onDone(file);
  };

  return (
    <div className="fixed inset-0 z-[60]" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/80" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[min(480px,92vw)] rounded-2xl bg-surface-2 border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-semibold text-sm">{title}</span>
          <span className="text-[11px] text-gray-500">{outputW}x{outputH}px</span>
        </div>

        {/* Cropper */}
        <div className="relative w-full" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={round ? "round" : "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={!round}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-3 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-gray-400 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M8 11h6" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-gray-400 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M8 11h6M11 8v6" />
          </svg>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 text-sm">
            Iptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-accent hover:bg-accent-dark text-white text-sm"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Canvas crop helper ─── */
function getCroppedFile(imageSrc, pixelCrop, outW, outH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, outW, outH,
      );

      canvas.toBlob((blob) => {
        const file = new File([blob], "cropped.png", { type: "image/png" });
        resolve(file);
      }, "image/png");
    };
    img.src = imageSrc;
  });
}
