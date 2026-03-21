import { useEffect, useState, useRef, useCallback } from "react";
import { getServerBotCommands } from "../../services/botApi";
import Avatar from "../common/Avatar";

const commandCache = {};

export default function CommandSuggestPopup({ serverId, query, onSelect, onClose }) {
  const [commands, setCommands] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef(null);

  // Fetch commands (cached per server)
  useEffect(() => {
    if (!serverId) return;
    if (commandCache[serverId]) {
      setCommands(commandCache[serverId]);
      return;
    }
    getServerBotCommands(serverId)
      .then((cmds) => {
        commandCache[serverId] = cmds;
        setCommands(cmds);
      })
      .catch(() => setCommands([]));
  }, [serverId]);

  // Filter by query
  useEffect(() => {
    const q = (query || "").toLowerCase();
    const result = commands.filter((c) =>
      c.name.toLowerCase().startsWith(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
    setFiltered(result);
    setSelectedIdx(0);
  }, [query, commands]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Tab" || (e.key === "Enter" && filtered.length > 0)) {
        e.preventDefault();
        onSelect(filtered[selectedIdx]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIdx, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (filtered.length === 0) return null;

  // Group by bot
  const grouped = {};
  for (const cmd of filtered) {
    const key = cmd.botUserId || "unknown";
    if (!grouped[key]) {
      grouped[key] = {
        botUsername: cmd.botUsername,
        botDisplayName: cmd.botDisplayName,
        botAvatarUrl: cmd.botAvatarUrl,
        commands: [],
      };
    }
    grouped[key].commands.push(cmd);
  }

  let flatIndex = 0;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-surface-4 border border-border-light rounded-xl shadow-2xl shadow-black/40 max-h-64 overflow-y-auto z-50"
      ref={listRef}
    >
      {Object.entries(grouped).map(([botId, group]) => (
        <div key={botId}>
          {/* Bot header */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
            <Avatar src={group.botAvatarUrl} name={group.botDisplayName || group.botUsername} size={18} />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {group.botDisplayName || group.botUsername}
            </span>
            <span className="bg-indigo-500 text-white text-[8px] px-1 py-0.5 rounded font-bold leading-none">BOT</span>
          </div>

          {/* Commands */}
          {group.commands.map((cmd) => {
            const idx = flatIndex++;
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={cmd.id || cmd.name}
                onClick={() => onSelect(cmd)}
                className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${
                  isSelected ? "bg-accent/20" : "hover:bg-surface-5"
                }`}
              >
                <span className="text-accent-light font-mono text-[13px] shrink-0">!{cmd.name}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-gray-300 truncate">{cmd.description}</p>
                  {cmd.usage && (
                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono">{cmd.usage}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Invalidate cache when bot is installed/uninstalled
export function invalidateCommandCache(serverId) {
  if (serverId) {
    delete commandCache[serverId];
  } else {
    Object.keys(commandCache).forEach((k) => delete commandCache[k]);
  }
}
