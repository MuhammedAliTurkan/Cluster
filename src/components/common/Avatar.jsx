const COLORS = [
  "bg-blue-600", "bg-green-600", "bg-purple-600",
  "bg-pink-600", "bg-orange-600", "bg-teal-600",
  "bg-red-600", "bg-indigo-600", "bg-cyan-600",
];

function hashName(name) {
  return (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length;
}

export default function Avatar({ src, name, size = 40, className = "" }) {
  const sizeStyle = { width: size, height: size, minWidth: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        style={sizeStyle}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  const bg = COLORS[hashName(name)];

  return (
    <div
      style={sizeStyle}
      className={`${bg} rounded-full grid place-items-center text-white font-semibold shrink-0 ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initial}</span>
    </div>
  );
}
