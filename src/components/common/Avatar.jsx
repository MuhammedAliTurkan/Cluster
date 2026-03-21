const COLORS = [
  "bg-emerald-600", "bg-teal-600", "bg-cyan-600",
  "bg-sky-600", "bg-violet-600", "bg-rose-600",
  "bg-amber-600", "bg-lime-600", "bg-fuchsia-600",
];

function hashName(name) {
  return (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length;
}

const STATUS_COLORS = {
  online: "bg-emerald-400",
  idle: "bg-amber-400",
  dnd: "bg-rose-500",
  offline: "bg-gray-500",
  invisible: "bg-gray-500",
};

export default function Avatar({ src, name, size = 40, className = "", status }) {
  const sizeStyle = { width: size, height: size, minWidth: size };
  const badgeSize = Math.max(10, size * 0.28);
  // Squircle radius — küçük avatarlarda daha yuvarlak, büyüklerde daha köşeli
  const radius = size <= 32 ? "30%" : size <= 48 ? "26%" : "22%";

  const badge = status ? (
    <span
      className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 ${STATUS_COLORS[status] || STATUS_COLORS.offline}`}
      style={{ width: badgeSize, height: badgeSize, borderColor: "var(--avatar-ring, #111214)" }}
    />
  ) : null;

  const squircleStyle = { ...sizeStyle, borderRadius: radius };

  if (src && src.length > 0) {
    return (
      <div className="relative shrink-0" style={sizeStyle}>
        <img
          src={src}
          alt={name || "avatar"}
          style={squircleStyle}
          className={`object-cover ${className}`}
        />
        {badge}
      </div>
    );
  }

  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  const bg = COLORS[hashName(name)];

  return (
    <div className="relative shrink-0" style={sizeStyle}>
      <div
        style={squircleStyle}
        className={`${bg} grid place-items-center text-white font-semibold ${className}`}
      >
        <span style={{ fontSize: size * 0.38 }}>{initial}</span>
      </div>
      {badge}
    </div>
  );
}
