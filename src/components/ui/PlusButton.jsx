export default function PlusButton({
  onClick,
  ariaLabel = "Ekle",
  title,
  size = "md",          // "sm" | "md" | "lg" | "xl"
  variant = "solid",    // "solid" | "ghost"
  className = "",
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-14 w-14",
  }[size];

  const base =
    "inline-grid place-items-center rounded-full transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 " +
    "active:scale-95";

  const style =
    variant === "solid"
      ? "bg-surface-3 border border-border-light hover:bg-surface-5"
      : "bg-transparent border border-border-light hover:bg-surface-3";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`${base} ${style} ${sizes} ${className}`}
    >
      {/* modern plus (stroke) */}
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 text-gray-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {/* subtle glow on hover */}
      <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-accent/15 opacity-0 hover:opacity-100 transition" />
    </button>
  );
}
