import { useState, useEffect, useRef } from "react";

const CAM_PRESETS = [
  { label: "360p", width: 640, height: 360 },
  { label: "480p", width: 854, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
];

const SCREEN_PRESETS = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
];

const FPS_OPTIONS = [15, 24, 30, 60];

export default function QualitySettings({ localParticipant, onClose }) {
  const ref = useRef(null);

  // Kalite ayarlarını localStorage'dan yükle
  const stored = JSON.parse(localStorage.getItem("clusterQuality") || "{}");
  const [camRes, setCamRes] = useState(stored.camRes || "720p");
  const [camFps, setCamFps] = useState(stored.camFps || 30);
  const [screenRes, setScreenRes] = useState(stored.screenRes || "1080p");
  const [screenFps, setScreenFps] = useState(stored.screenFps || 30);

  // Dışına tıklayınca kapat
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const applySettings = async () => {
    const cam = CAM_PRESETS.find((p) => p.label === camRes) || CAM_PRESETS[2];
    const screen = SCREEN_PRESETS.find((p) => p.label === screenRes) || SCREEN_PRESETS[1];

    // Kaydet
    localStorage.setItem("clusterQuality", JSON.stringify({ camRes, camFps, screenRes, screenFps }));

    // Kamera track'i güncelle
    const camPub = localParticipant.getTrackPublication("camera");
    if (camPub?.track) {
      try {
        const constraints = {
          width: { ideal: cam.width },
          height: { ideal: cam.height },
          frameRate: { ideal: camFps },
        };
        await camPub.track.mediaStreamTrack?.applyConstraints(constraints);
      } catch (e) { console.warn("Cam quality apply failed:", e); }
    }

    // Ekran paylaşımı track'i güncelle
    const screenPub = localParticipant.getTrackPublication("screen_share");
    if (screenPub?.track) {
      try {
        const constraints = {
          width: { ideal: screen.width },
          height: { ideal: screen.height },
          frameRate: { ideal: screenFps },
        };
        await screenPub.track.mediaStreamTrack?.applyConstraints(constraints);
      } catch (e) { console.warn("Screen quality apply failed:", e); }
    }

    onClose();
  };

  return (
    <div ref={ref}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 bg-[#1e1f22] border border-[#3a3d43] rounded-xl p-4 shadow-2xl z-50">
      <div className="text-white text-sm font-medium mb-3">Kalite Ayarları</div>

      {/* Kamera */}
      <div className="mb-3">
        <div className="text-gray-400 text-xs mb-1.5">Kamera Çözünürlüğü</div>
        <div className="flex gap-1">
          {CAM_PRESETS.map((p) => (
            <button key={p.label} onClick={() => setCamRes(p.label)}
              className={`flex-1 py-1 rounded text-xs transition ${
                camRes === p.label ? "bg-blue-500 text-white" : "bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]"
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-gray-400 text-xs mb-1.5">Kamera FPS</div>
        <div className="flex gap-1">
          {FPS_OPTIONS.map((f) => (
            <button key={f} onClick={() => setCamFps(f)}
              className={`flex-1 py-1 rounded text-xs transition ${
                camFps === f ? "bg-blue-500 text-white" : "bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]"
              }`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 my-3" />

      {/* Ekran Paylaşımı */}
      <div className="mb-3">
        <div className="text-gray-400 text-xs mb-1.5">Ekran Paylaşımı Çözünürlüğü</div>
        <div className="flex gap-1">
          {SCREEN_PRESETS.map((p) => (
            <button key={p.label} onClick={() => setScreenRes(p.label)}
              className={`flex-1 py-1 rounded text-xs transition ${
                screenRes === p.label ? "bg-purple-500 text-white" : "bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]"
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-gray-400 text-xs mb-1.5">Ekran Paylaşımı FPS</div>
        <div className="flex gap-1">
          {FPS_OPTIONS.map((f) => (
            <button key={f} onClick={() => setScreenFps(f)}
              className={`flex-1 py-1 rounded text-xs transition ${
                screenFps === f ? "bg-purple-500 text-white" : "bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]"
              }`}>{f}</button>
          ))}
        </div>
      </div>

      <button onClick={applySettings}
        className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">
        Uygula
      </button>
    </div>
  );
}
