import { initialsFromName } from "@/utils/initials";

export default function LetterBadge({ name, size = 32, className = "" }) {
  const ch = initialsFromName(name);
  const style = { width: size, height: size, lineHeight: `${size}px` };
  return (
    <div
      style={style}
      className={`rounded-xl bg-white/10 text-white/80 text-sm font-medium grid place-items-center select-none ${className}`}
      aria-label={name || "?"}
      title={name || "?"}
    >
      {ch}
    </div>
  );
}
