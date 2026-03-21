import { useState, useEffect, useRef, useCallback } from "react";
import Avatar from "../common/Avatar";

/**
 * @ yazılınca üye listesinden autocomplete popup.
 * Props:
 *  - members: [{user: {id, username, displayName, avatarUrl}, nickname}]
 *  - query: "@" sonrasındaki metin
 *  - onSelect: (username) => void
 *  - onClose: () => void
 *  - anchorRect: input element'inin getBoundingClientRect()
 */
export default function MentionSuggest({ members, query, onSelect, onClose, anchorRect }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ref = useRef(null);

  const q = (query || "").toLowerCase();
  const filtered = members.filter((m) => {
    const name = (m.nickname || m.user?.displayName || m.user?.username || "").toLowerCase();
    const uname = (m.user?.username || "").toLowerCase();
    return name.includes(q) || uname.includes(q);
  }).slice(0, 8);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Keyboard navigation
  const handleKey = useCallback((e) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => (i + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length); }
    else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const m = filtered[selectedIdx];
      if (m) onSelect(m.user?.username);
    }
    else if (e.key === "Escape") onClose();
  }, [filtered, selectedIdx, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [handleKey]);

  if (!filtered.length || !anchorRect) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-surface-2 border border-border-light rounded-xl shadow-2xl shadow-black/40 py-1 max-h-64 overflow-y-auto w-64"
      style={{ bottom: window.innerHeight - anchorRect.top + 8, left: anchorRect.left }}
    >
      <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase">Üyeler</div>
      {filtered.map((m, i) => {
        const name = m.nickname || m.user?.displayName || m.user?.username;
        return (
          <button
            key={m.user?.id || i}
            onMouseDown={(e) => { e.preventDefault(); onSelect(m.user?.username); }}
            onMouseEnter={() => setSelectedIdx(i)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition ${
              i === selectedIdx ? "bg-accent/20 text-white" : "text-gray-300 hover:bg-surface-4"
            }`}
          >
            <Avatar src={m.user?.avatarUrl} name={name} size={24} />
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{name}</div>
              {m.user?.username !== name && (
                <div className="text-[10px] text-gray-500 truncate">@{m.user?.username}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
