import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "cl-layout-v2";

const DEFAULT = {
  left: "sidebar",
  right: "members",
  center: ["chat"],
  centerDirection: "col", // "col" = üst-alt, "row" = yan yana
  centerSplit: 50, // ilk panelin yüzde oranı (2 panel varken)
  leftWidth: 240,
  rightWidth: 260,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const v = JSON.parse(raw);
    return {
      left: v.left ?? DEFAULT.left,
      right: v.right ?? DEFAULT.right,
      center: Array.isArray(v.center) ? v.center : [...DEFAULT.center],
      centerDirection: v.centerDirection ?? DEFAULT.centerDirection,
      centerSplit: v.centerSplit ?? DEFAULT.centerSplit,
      leftWidth: v.leftWidth ?? DEFAULT.leftWidth,
      rightWidth: v.rightWidth ?? DEFAULT.rightWidth,
    };
  } catch { return { ...DEFAULT }; }
}

export function useLayoutStore(mediaInCall) {
  const [layout, setLayout] = useState(load);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  // Sesliye girince: chat → voice (mesajlar gizlenir, sesli aynı yerde açılır)
  // Sesli bitince: voice → chat (mesajlar geri gelir)
  useEffect(() => {
    if (mediaInCall) {
      setLayout(prev => {
        if (prev.center.includes("voice")) return prev; // zaten var
        const idx = prev.center.indexOf("chat");
        if (idx >= 0) {
          // Chat'in yerine voice koy
          const c = [...prev.center];
          c[idx] = "voice";
          return { ...prev, center: c };
        }
        // Chat yoksa voice'u ekle
        return { ...prev, center: [...prev.center, "voice"] };
      });
    } else {
      setLayout(prev => {
        if (!prev.center.includes("voice")) return prev;
        const idx = prev.center.indexOf("voice");
        const c = [...prev.center];
        // Voice'un yerine chat koy (chat yoksa)
        if (!c.includes("chat")) {
          c[idx] = "chat";
        } else {
          c.splice(idx, 1);
        }
        return { ...prev, center: c };
      });
    }
  }, [mediaInCall]);

  // Seslideyken text kanala tıklayınca chat panelini aç
  useEffect(() => {
    const handler = () => {
      setLayout(prev => {
        if (prev.center.includes("chat")) return prev;
        return { ...prev, center: [...prev.center, "chat"] };
      });
    };
    window.addEventListener("show-chat-panel", handler);
    return () => window.removeEventListener("show-chat-panel", handler);
  }, []);

  // Eski localStorage key'leri temizle (migration)
  useEffect(() => {
    ["cl-layout", "cl-hidden-panels", "cl-locks", "cl-panel-order",
     "cl-docks", "cl-sidebar-size", "cl-members-size", "cl-voice-size", "cl-chat-size"
    ].forEach(k => localStorage.removeItem(k));
  }, []);

  const update = useCallback((fn) => setLayout(prev => ({ ...prev, ...fn(prev) })), []);

  /** ViewMenu toggle */
  const togglePanel = useCallback((id) => {
    setLayout(prev => {
      // Sidebar / Members — sol veya sağ sütunda
      if (id === "sidebar" || id === "members") {
        if (prev.left === id) return { ...prev, left: null };
        if (prev.right === id) return { ...prev, right: null };
        // Ekle — tercih: sidebar sol, members sağ
        const preferSide = id === "sidebar" ? "left" : "right";
        const otherSide = preferSide === "left" ? "right" : "left";
        if (!prev[preferSide]) return { ...prev, [preferSide]: id };
        if (!prev[otherSide]) return { ...prev, [otherSide]: id };
        // İkisi de dolu — tercih edilen tarafa koy, eskisini at
        return { ...prev, [preferSide]: id };
      }
      // Chat / Voice — center array'de
      if (prev.center.includes(id)) {
        const without = prev.center.filter(p => p !== id);
        // Seslide iken chat kapatılırsa → voice'u koy yerine
        if (id === "chat" && mediaInCall && !without.includes("voice")) {
          return { ...prev, center: [...without, "voice"] };
        }
        return { ...prev, center: without };
      }
      if (id === "voice" && !mediaInCall) return prev; // Seslide değilse voice açılamaz
      return { ...prev, center: [...prev.center, id] };
    });
  }, [mediaInCall]);

  /** Sol ↔ Sağ swap */
  const swapSides = useCallback(() => {
    update(prev => ({ left: prev.right, right: prev.left }));
  }, [update]);

  /** Center panel sırasını değiştir + yön belirle */
  const reorderCenter = useCallback((fromIdx, toIdx, direction) => {
    setLayout(prev => {
      const c = [...prev.center];
      const [item] = c.splice(fromIdx, 1);
      c.splice(toIdx, 0, item);
      const updates = { center: c };
      if (direction) updates.centerDirection = direction;
      return { ...prev, ...updates };
    });
  }, []);

  /** Resize */
  const setLeftWidth = useCallback((w) => {
    update(() => ({ leftWidth: Math.max(180, Math.min(400, w)) }));
  }, [update]);

  const setRightWidth = useCallback((w) => {
    update(() => ({ rightWidth: Math.max(180, Math.min(400, w)) }));
  }, [update]);

  const setCenterSplit = useCallback((pct) => {
    update(() => ({ centerSplit: Math.max(20, Math.min(80, pct)) }));
  }, [update]);

  // Derived
  const shows = {
    sidebar: layout.left === "sidebar" || layout.right === "sidebar",
    members: layout.left === "members" || layout.right === "members",
    chat: layout.center.includes("chat"),
    voice: layout.center.includes("voice"),
  };

  return {
    layout, shows,
    togglePanel, swapSides, reorderCenter,
    setLeftWidth, setRightWidth, setCenterSplit,
  };
}
