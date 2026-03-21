import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const CAM_PRESETS = [
  { label: "360p", width: 640, height: 360 },
  { label: "480p", width: 854, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
];

const SCREEN_PRESETS = [
  { label: "360p", width: 640, height: 360 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
];

const FPS_OPTIONS = [15, 24, 30, 60];

// FPS ve çözünürlüğe göre önerilen bitrate (kbps)
function suggestBitrate(width, height, fps) {
  const pixels = width * height;
  // Base: piksel başına ~3 bit @ 30fps, FPS oranıyla ölçekle
  const base = pixels * 3 * (fps / 30);
  const kbps = Math.round(base / 1000);
  // Makul aralıkta tut
  return Math.max(200, Math.min(kbps, 15000));
}

const BITRATE_PRESETS = [
  { label: "Otomatik", factor: "auto" },
  { label: "Düşük", factor: 0.5 },
  { label: "Orta", factor: 1.0 },
  { label: "Yüksek", factor: 1.5 },
  { label: "Özel", factor: null },
];

export default function QualitySettings({ localParticipant, onClose }) {
  const ref = useRef(null);
  const anchorRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const stored = JSON.parse(localStorage.getItem("clusterQuality") || "{}");
  const [camRes, setCamRes] = useState(stored.camRes || "720p");
  const [camFps, setCamFps] = useState(stored.camFps || 30);
  const [screenRes, setScreenRes] = useState(stored.screenRes || "1080p");
  const [screenFps, setScreenFps] = useState(stored.screenFps || 30);
  const [bitrateMode, setBitrateMode] = useState(stored.bitrateMode || "Otomatik");
  const [customBitrate, setCustomBitrate] = useState(stored.customBitrate || 2500);
  const [screenBitrateMode, setScreenBitrateMode] = useState(stored.screenBitrateMode || "Otomatik");
  const [screenCustomBitrate, setScreenCustomBitrate] = useState(stored.screenCustomBitrate || 4000);

  // Kamera bitrate hesaplama
  const camPreset = CAM_PRESETS.find((p) => p.label === camRes) || CAM_PRESETS[2];
  const camBaseBitrate = suggestBitrate(camPreset.width, camPreset.height, camFps);
  const camBitrateFactor = BITRATE_PRESETS.find((p) => p.label === bitrateMode)?.factor;
  const isCamAuto = camBitrateFactor === "auto";
  const effectiveCamBitrate = isCamAuto ? camBaseBitrate
    : camBitrateFactor != null ? Math.round(camBaseBitrate * camBitrateFactor) : customBitrate;

  // Ekran bitrate hesaplama
  const screenPreset = SCREEN_PRESETS.find((p) => p.label === screenRes) || SCREEN_PRESETS[1];
  const screenBaseBitrate = suggestBitrate(screenPreset.width, screenPreset.height, screenFps);
  const screenBitrateFactor = BITRATE_PRESETS.find((p) => p.label === screenBitrateMode)?.factor;
  const isScreenAuto = screenBitrateFactor === "auto";
  const effectiveScreenBitrate = isScreenAuto ? screenBaseBitrate
    : screenBitrateFactor != null ? Math.round(screenBaseBitrate * screenBitrateFactor) : screenCustomBitrate;

  // Pozisyon hesapla
  useEffect(() => {
    const btn = anchorRef.current?.parentElement;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setPos({
        top: Math.max(8, r.top - 520),
        left: Math.max(8, Math.min(r.left + r.width / 2 - 152, window.innerWidth - 312)),
      });
    } else {
      setPos({ top: window.innerHeight / 2 - 260, left: window.innerWidth / 2 - 152 });
    }
  }, []);

  // Dışına tıklayınca kapat
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const applySettings = async () => {
    localStorage.setItem("clusterQuality", JSON.stringify({
      camRes, camFps, screenRes, screenFps,
      bitrateMode, customBitrate, screenBitrateMode, screenCustomBitrate,
    }));

    const camPub = localParticipant.getTrackPublication("camera");
    if (camPub?.track) {
      try {
        await camPub.track.mediaStreamTrack?.applyConstraints({
          width: { ideal: camPreset.width }, height: { ideal: camPreset.height }, frameRate: { ideal: camFps },
        });
        // LiveKit encoding parametreleri (Otomatik modda sınır koymaz — LiveKit adaptif ayarlar)
        if (!isCamAuto && camPub.track.sender) {
          const senderParams = camPub.track.sender.getParameters();
          if (senderParams.encodings?.[0]) {
            senderParams.encodings[0].maxBitrate = effectiveCamBitrate * 1000;
            await camPub.track.sender.setParameters(senderParams);
          }
        } else if (isCamAuto && camPub.track.sender) {
          // Otomatik: maxBitrate sınırını kaldır, LiveKit/WebRTC kendi ayarlasın
          const senderParams = camPub.track.sender.getParameters();
          if (senderParams.encodings?.[0]) {
            delete senderParams.encodings[0].maxBitrate;
            await camPub.track.sender.setParameters(senderParams);
          }
        }
      } catch (e) { console.warn("Camera quality apply failed:", e); }
    }

    const screenPub = localParticipant.getTrackPublication("screen_share");
    if (screenPub?.track) {
      try {
        await screenPub.track.mediaStreamTrack?.applyConstraints({
          width: { ideal: screenPreset.width }, height: { ideal: screenPreset.height }, frameRate: { ideal: screenFps },
        });
        if (!isScreenAuto && screenPub.track.sender) {
          const senderParams = screenPub.track.sender.getParameters();
          if (senderParams.encodings?.[0]) {
            senderParams.encodings[0].maxBitrate = effectiveScreenBitrate * 1000;
            await screenPub.track.sender.setParameters(senderParams);
          }
        } else if (isScreenAuto && screenPub.track.sender) {
          const senderParams = screenPub.track.sender.getParameters();
          if (senderParams.encodings?.[0]) {
            delete senderParams.encodings[0].maxBitrate;
            await screenPub.track.sender.setParameters(senderParams);
          }
        }
      } catch (e) { console.warn("Screen quality apply failed:", e); }
    }

    onClose();
  };

  const Pill = ({ label, active, color = "accent", onClick }) => (
    <button onClick={onClick}
      className={`flex-1 py-1 rounded text-xs transition ${
        active ? `bg-${color} text-white` : "bg-surface-3 text-gray-300 hover:bg-surface-5"
      }`}>{label}</button>
  );

  return createPortal(
    <>
      <span ref={anchorRef} className="hidden" />
      <div ref={ref}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999 }}
        className="w-76 bg-surface-2 border border-border-light rounded-xl p-4 shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto">
        <div className="text-white text-sm font-medium mb-3">Kalite Ayarları</div>

        {/* ── Kamera ── */}
        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1.5">Kamera Çözünürlüğü</div>
          <div className="flex gap-1">
            {CAM_PRESETS.map((p) => (
              <Pill key={p.label} label={p.label} active={camRes === p.label} onClick={() => setCamRes(p.label)} />
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1.5">Kamera FPS</div>
          <div className="flex gap-1">
            {FPS_OPTIONS.map((f) => (
              <Pill key={f} label={f} active={camFps === f} onClick={() => setCamFps(f)} />
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1.5 flex items-center justify-between">
            <span>Kamera Bitrate</span>
            <span className="text-emerald-400 font-mono text-[10px]">{isCamAuto ? "Otomatik" : `${effectiveCamBitrate} kbps`}</span>
          </div>
          <div className="flex gap-1">
            {BITRATE_PRESETS.map((p) => (
              <Pill key={p.label} label={p.label} active={bitrateMode === p.label} onClick={() => setBitrateMode(p.label)} />
            ))}
          </div>
          {bitrateMode === "Özel" && (
            <div className="mt-2">
              <input
                type="range" min="200" max="8000" step="100"
                value={customBitrate}
                onChange={(e) => setCustomBitrate(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                <span>200</span><span>{customBitrate} kbps</span><span>8000</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 my-3" />

        {/* ── Ekran Paylaşımı ── */}
        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1.5">Ekran Paylaşımı Çözünürlüğü</div>
          <div className="flex gap-1">
            {SCREEN_PRESETS.map((p) => (
              <Pill key={p.label} label={p.label} active={screenRes === p.label}
                color="violet-500" onClick={() => setScreenRes(p.label)} />
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1.5">Ekran Paylaşımı FPS</div>
          <div className="flex gap-1">
            {FPS_OPTIONS.map((f) => (
              <Pill key={f} label={f} active={screenFps === f}
                color="violet-500" onClick={() => setScreenFps(f)} />
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1.5 flex items-center justify-between">
            <span>Ekran Bitrate</span>
            <span className="text-violet-400 font-mono text-[10px]">{isScreenAuto ? "Otomatik" : `${effectiveScreenBitrate} kbps`}</span>
          </div>
          <div className="flex gap-1">
            {BITRATE_PRESETS.map((p) => (
              <Pill key={p.label} label={p.label} active={screenBitrateMode === p.label}
                color="violet-500" onClick={() => setScreenBitrateMode(p.label)} />
            ))}
          </div>
          {screenBitrateMode === "Özel" && (
            <div className="mt-2">
              <input
                type="range" min="500" max="15000" step="250"
                value={screenCustomBitrate}
                onChange={(e) => setScreenCustomBitrate(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                <span>500</span><span>{screenCustomBitrate} kbps</span><span>15000</span>
              </div>
            </div>
          )}
        </div>

        {/* Özet bilgi */}
        <div className="bg-surface-0 rounded-lg p-2.5 mb-3 text-[10px] text-gray-400 space-y-0.5">
          <div>Kamera: {camRes} @ {camFps}fps → <span className="text-emerald-400">{isCamAuto ? "Otomatik (adaptif)" : `${effectiveCamBitrate} kbps`}</span></div>
          <div>Ekran: {screenRes} @ {screenFps}fps → <span className="text-violet-400">{isScreenAuto ? "Otomatik (adaptif)" : `${effectiveScreenBitrate} kbps`}</span></div>
        </div>

        <button onClick={applySettings}
          className="w-full py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-medium transition">
          Uygula
        </button>
      </div>
    </>,
    document.body
  );
}
