import { useEffect, useSyncExternalStore, useCallback } from "react";

// ── Global Audio (component lifecycle'dan bağımsız) ──
const audio = new Audio();
audio.loop = true;

let currentUrl = null;
let volume = parseFloat(localStorage.getItem("cl-bgmusic-volume")) || 0.05;
let muted = localStorage.getItem("cl-bgmusic-muted") === "true";
let stopped = false;

// Kullanıcının elle durdurduğu URL'leri hatırla (oturum boyunca)
const userStoppedUrls = new Set();

audio.volume = muted ? 0 : volume;

// ── Subscriber pattern for useSyncExternalStore ──
const listeners = new Set();
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { for (const fn of listeners) fn(); }
let snap = 0;
function getSnapshot() { return snap; }
function bump() { snap++; notify(); }

// Autoplay policy: kullanıcı etkileşime geçince bekleyen play'i tetikle
let pendingPlay = false;
function tryPlay() {
  pendingPlay = false;
  audio.play().then(() => bump()).catch(() => { pendingPlay = true; });
}
function onInteraction() {
  if (pendingPlay && currentUrl && !stopped) {
    tryPlay();
  }
}
document.addEventListener("click", onInteraction);
document.addEventListener("keydown", onInteraction);

// Sesli kanala girildiğinde dışarıdan çağrılır
let pausedForVoice = false;
export function pauseBgMusicForVoice() {
  if (!audio.paused && currentUrl && !stopped) {
    pausedForVoice = true;
    audio.pause();
    bump();
  }
}
export function resumeBgMusicFromVoice() {
  if (pausedForVoice && currentUrl && !stopped) {
    pausedForVoice = false;
    tryPlay();
  }
  pausedForVoice = false;
}

export function useBgMusic(bgMusicUrl) {
  useEffect(() => {
    // Müzik yoksa durdur
    if (!bgMusicUrl) {
      if (currentUrl) {
        currentUrl = null;
        stopped = true;
        pendingPlay = false;
        audio.pause();
        audio.src = "";
        bump();
      }
      return;
    }

    // Aynı URL zaten çalıyorsa dokunma
    if (bgMusicUrl === currentUrl) {
      if (!stopped && audio.paused) tryPlay();
      return;
    }

    // Farklı URL — geçiş yap
    currentUrl = bgMusicUrl;
    // Kullanıcı bu URL'i daha önce elle durdurduysa, durdurulmuş olarak başlat
    if (userStoppedUrls.has(bgMusicUrl)) {
      stopped = true;
      audio.pause();
      audio.src = bgMusicUrl;
      bump();
      return;
    }
    stopped = false;
    audio.src = bgMusicUrl;
    audio.volume = muted ? 0 : volume;
    tryPlay();
    bump();
  }, [bgMusicUrl]);

  useSyncExternalStore(subscribe, getSnapshot);

  return {
    isPlaying: !audio.paused && !stopped,
    isMuted: muted,
    isStopped: stopped,
    volume,
    hasMusic: !!currentUrl,

    toggleMute: useCallback(() => {
      muted = !muted;
      localStorage.setItem("cl-bgmusic-muted", String(muted));
      audio.volume = muted ? 0 : volume;
      bump();
    }, []),

    setVolume: useCallback((val) => {
      volume = val;
      localStorage.setItem("cl-bgmusic-volume", String(val));
      if (muted && val > 0) {
        muted = false;
        localStorage.setItem("cl-bgmusic-muted", "false");
      }
      audio.volume = muted ? 0 : volume;
      bump();
    }, []),

    stop: useCallback(() => {
      stopped = true;
      pendingPlay = false;
      if (currentUrl) userStoppedUrls.add(currentUrl);
      audio.pause();
      audio.currentTime = 0;
      bump();
    }, []),

    play: useCallback(() => {
      stopped = false;
      if (currentUrl) {
        userStoppedUrls.delete(currentUrl);
        audio.volume = muted ? 0 : volume;
        tryPlay();
      }
      bump();
    }, []),
  };
}
