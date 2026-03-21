// public/sounds/ klasörüne ses dosyaları koy:
//   join.wav, leave.wav, ringtone.wav, message.wav (veya .mp3)

const cache = {};

const EXT = {
  join: "wav",
  leave: "wav",
  ringtone: "wav",
  message: "wav",
};

function getAudio(name) {
  if (!cache[name]) {
    const ext = EXT[name] || "mp3";
    cache[name] = new Audio(`/sounds/${name}.${ext}`);
  }
  return cache[name];
}

export function playSound(name, volume = 0.5) {
  try {
    const audio = getAudio(name);
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}

// Kısa yollar
export const sounds = {
  join:     (vol) => playSound("join", vol ?? 0.5),
  leave:    (vol) => playSound("leave", vol ?? 0.5),
  ringtone: (vol) => playSound("ringtone", vol ?? 0.6),
  message:  (vol) => playSound("message", vol ?? 0.3),
};
