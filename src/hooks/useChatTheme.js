import { useMemo } from "react";

const STORAGE_KEY = "cl-user-theme";

/* CSS animasyonlu arka plan presetleri (id → style) */
const CSS_BG_STYLES = {
  "gradient-aurora": {
    background: "linear-gradient(-45deg, #0f172a, #1e1b4b, #0c4a6e, #064e3b)",
    backgroundSize: "400% 400%",
    animation: "bgShift 15s ease infinite",
  },
  "gradient-sunset": {
    background: "linear-gradient(-45deg, #1a0a2e, #4a1942, #7c2d12, #451a03)",
    backgroundSize: "400% 400%",
    animation: "bgShift 12s ease infinite",
  },
  "gradient-ocean": {
    background: "linear-gradient(-45deg, #0c1220, #0e2439, #0c4a6e, #164e63)",
    backgroundSize: "400% 400%",
    animation: "bgShift 18s ease infinite",
  },
  "gradient-forest": {
    background: "linear-gradient(-45deg, #052e16, #14532d, #1a2e05, #365314)",
    backgroundSize: "400% 400%",
    animation: "bgShift 20s ease infinite",
  },
  "gradient-nebula": {
    background: "linear-gradient(-45deg, #2e1065, #4c1d95, #831843, #1e1b4b)",
    backgroundSize: "400% 400%",
    animation: "bgShift 14s ease infinite",
  },
  "mesh-dark": {
    backgroundColor: "#0c0d0f",
    backgroundImage: `radial-gradient(at 20% 30%, rgba(16,185,129,0.08) 0, transparent 50%),
      radial-gradient(at 80% 70%, rgba(59,130,246,0.08) 0, transparent 50%),
      radial-gradient(at 50% 50%, rgba(139,92,246,0.05) 0, transparent 50%)`,
  },
  "particles": {
    backgroundColor: "#0c0d0f",
    backgroundImage: `radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.15) 50%, transparent 50%),
      radial-gradient(1px 1px at 30% 60%, rgba(255,255,255,0.1) 50%, transparent 50%),
      radial-gradient(1px 1px at 50% 40%, rgba(255,255,255,0.12) 50%, transparent 50%),
      radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.08) 50%, transparent 50%),
      radial-gradient(1px 1px at 90% 30%, rgba(255,255,255,0.1) 50%, transparent 50%),
      radial-gradient(2px 2px at 15% 85%, rgba(16,185,129,0.2) 50%, transparent 50%),
      radial-gradient(2px 2px at 85% 15%, rgba(59,130,246,0.2) 50%, transparent 50%)`,
  },
};

export function getUserTheme() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function setUserTheme(theme) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
}

/**
 * Aktif chat temasını döndürür.
 * serverData: { chatBackgroundUrl, themeJson } — sunucu bilgisi
 */
export function useChatTheme(serverData) {
  return useMemo(() => {
    const userTheme = getUserTheme();
    const prefer = userTheme.prefer || "server";

    // Sunucu teması
    let serverTheme = {};
    if (serverData?.themeJson) {
      try { serverTheme = JSON.parse(serverData.themeJson); } catch {}
    }
    if (serverData?.chatBackgroundUrl) {
      serverTheme.chatBackgroundUrl = serverData.chatBackgroundUrl;
    }

    // Tercih edilen temayı belirle
    const hasServerBg = !!(serverTheme.chatBackgroundUrl || serverTheme.cssBgPreset);
    const hasUserBg = !!(userTheme.chatBackgroundUrl || userTheme.cssBgPreset);

    const active = prefer === "server" && hasServerBg
      ? serverTheme
      : hasUserBg
        ? userTheme
        : serverTheme;

    // CSS preset varsa style hesapla
    const cssBgPreset = active.cssBgPreset || null;
    const cssBgStyle = cssBgPreset ? (CSS_BG_STYLES[cssBgPreset] || null) : null;

    return {
      chatBackgroundUrl: active.chatBackgroundUrl || null,
      cssBgPreset,
      cssBgStyle,
      accentColor: active.accentColor || null,
      opacity: active.opacity ?? 0.85,
      prefer,
    };
  }, [serverData]);
}
