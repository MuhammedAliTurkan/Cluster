import { useEffect, useRef } from "react";
import { useMedia } from "../context/MediaContext";

/**
 * Tuş atamalarını dinler ve ilgili aksiyonları tetikler.
 * Tüm uygulama genelinde aktif — input/textarea odaklıyken devre dışı.
 */

const DEFAULT_BINDS = {
  toggleMic: "Alt+M",
  toggleDeafen: "Alt+D",
  leaveCall: "Alt+Q",
  pushToTalk: "",       // boş = devre dışı
};

function loadBinds() {
  try {
    return { ...DEFAULT_BINDS, ...JSON.parse(localStorage.getItem("cl-keybinds") || "{}") };
  } catch { return { ...DEFAULT_BINDS }; }
}

function saveBinds(binds) {
  localStorage.setItem("cl-keybinds", JSON.stringify(binds));
}

/** "Alt+Shift+M" gibi string'i event ile karşılaştır */
function matchesKey(combo, e) {
  if (!combo) return false;
  const parts = combo.split("+").map(p => p.trim().toLowerCase());
  const key = parts[parts.length - 1];
  const needCtrl = parts.includes("ctrl");
  const needAlt = parts.includes("alt");
  const needShift = parts.includes("shift");

  if (needCtrl !== e.ctrlKey) return false;
  if (needAlt !== e.altKey) return false;
  if (needShift !== e.shiftKey) return false;

  return e.key.toLowerCase() === key || e.code.toLowerCase() === key.replace("key", "").toLowerCase();
}

/** Event'ten okunabilir tuş string'i üret */
function eventToCombo(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  let key = e.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else if (key.startsWith("Arrow")) key = key;

  if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
    parts.push(key);
  }
  return parts.join("+");
}

export function useKeybinds() {
  const media = useMedia();
  const pttActiveRef = useRef(false);
  const bindsRef = useRef(loadBinds());

  // Binds değişince güncelle
  useEffect(() => {
    const handler = () => { bindsRef.current = loadBinds(); };
    window.addEventListener("keybinds-updated", handler);
    return () => window.removeEventListener("keybinds-updated", handler);
  }, []);

  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
    };

    const onKeyDown = (e) => {
      // Push-to-talk: input'tayken bile çalışır
      const binds = bindsRef.current;
      if (binds.pushToTalk && matchesKey(binds.pushToTalk, e)) {
        e.preventDefault();
        if (!pttActiveRef.current && media.inCall) {
          pttActiveRef.current = true;
          media.setMic(true); // bas-konuş: aç
        }
        return;
      }

      if (isInputFocused()) return; // Diğer kısayollar input'ta çalışmaz

      if (matchesKey(binds.toggleMic, e)) {
        e.preventDefault();
        // PTT modunda mic toggle çalışmaz
        if (media.inCall && media.inputMode !== "ptt") media.toggleMic();
      }
      if (matchesKey(binds.toggleDeafen, e)) {
        e.preventDefault();
        if (media.inCall) media.toggleDeafen();
      }
      if (matchesKey(binds.leaveCall, e)) {
        e.preventDefault();
        if (media.inCall) {
          // leaveCall event'i fırlat — PersistentVoice'un onLeave'ini tetikler
          window.dispatchEvent(new Event("keybind-leave-call"));
        }
      }
    };

    const onKeyUp = (e) => {
      const binds = bindsRef.current;
      if (binds.pushToTalk && pttActiveRef.current) {
        pttActiveRef.current = false;
        if (media.inCall) media.setMic(false); // bas-konuş: kapat
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [media]);
}

export { DEFAULT_BINDS, loadBinds, saveBinds, eventToCombo };
