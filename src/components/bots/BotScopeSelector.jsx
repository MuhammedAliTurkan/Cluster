import { BOT_SCOPES } from "../../services/botApi";

export default function BotScopeSelector({ selected, onChange }) {
  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {BOT_SCOPES.map((s) => (
        <label
          key={s.key}
          className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(s.key)}
            onChange={() => toggle(s.key)}
            className="accent-indigo-500"
          />
          {s.label}
        </label>
      ))}
    </div>
  );
}
