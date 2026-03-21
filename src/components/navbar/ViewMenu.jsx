import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PANELS_SERVER = [
  { id: "sidebar", label: "Kanallar", icon: "sidebar" },
  { id: "members", label: "Üyeler", icon: "members" },
  { id: "chat",    label: "Mesajlar", icon: "chat" },
  { id: "voice",   label: "Sesli Sohbet", icon: "voice" },
];

const PANELS_DM = [
  { id: "sidebar", label: "Sohbetler", icon: "sidebar" },
  { id: "members", label: "Arkadaşlar", icon: "members" },
  { id: "chat",    label: "Mesajlar", icon: "chat" },
  { id: "voice",   label: "Sesli Sohbet", icon: "voice" },
];

function PanelIcon({ type }) {
  const cls = "w-4 h-4";
  if (type === "sidebar") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}>
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" />
    </svg>
  );
  if (type === "members") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  );
  if (type === "voice") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function ViewMenu({ shows, toggles, isDMArea, mediaInCall, onClose, anchorRef }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const panels = isDMArea ? PANELS_DM : PANELS_SERVER;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 99999 }}
      className="w-56 bg-surface-3 border border-border-light rounded-xl shadow-2xl shadow-black/40 py-1"
    >
      {panels.map(({ id, label, icon }) => {
        const visible = shows[id];
        const disabled = id === "voice" && !mediaInCall;

        return (
          <button
            key={id}
            onClick={() => { if (!disabled) toggles[id](); }}
            disabled={disabled}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition rounded-lg mx-1 ${
              disabled ? "text-gray-600 cursor-not-allowed" :
              visible ? "text-white hover:bg-surface-5" : "text-gray-500 hover:bg-surface-5"
            }`}
          >
            <PanelIcon type={icon} />
            <span className="flex-1 text-left">{label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
              disabled ? "bg-surface-1 text-gray-700" :
              visible ? "bg-accent/15 text-accent-light" : "bg-surface-1 text-gray-600"
            }`}>
              {disabled ? "Seslide degil" : visible ? "Acik" : "Gizli"}
            </span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}
