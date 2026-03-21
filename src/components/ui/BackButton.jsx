import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Modern Discord-like BackButton
 * - Varsayılan: history back
 * - to={-1} | to="/app" ile özelleştirilebilir
 * - showLabel: buton yanında metin
 * - showHint: sağda "Esc" klavye ipucu rozeti
 */
export default function BackButton({
  to,
  label = "Geri",
  showLabel = true,
  showHint = true,
  className = "",
  onClick,
}) {
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof to === "number") navigate(to);
    else if (typeof to === "string") navigate(to);
    else navigate(-1);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" || (e.altKey && e.key === "ArrowLeft")) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Icon button */}
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          onClick?.(e);
          goBack();
        }}
        className="
          group relative inline-flex h-9 w-9 items-center justify-center
          rounded-full border border-border/80 bg-surface-2
          shadow-sm
          transition
          hover:border-border-light hover:bg-surface-3
          active:scale-95
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
        "
      >
        {/* chevron-left svg */}
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-gray-300 transition group-hover:text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>

        {/* subtle glow on hover */}
        <span
          className="
            pointer-events-none absolute inset-0 rounded-full
            opacity-0 transition group-hover:opacity-100
            ring-2 ring-accent/20
          "
        />
      </button>

      {/* Label (optional) */}
      {showLabel && (
        <span className="text-sm text-gray-300 select-none">
          {label}
        </span>
      )}

      {/* Keyboard hint (optional) */}
      {showHint && (
        <span
          className="
            ml-1 hidden sm:inline-flex items-center justify-center
            rounded-md border border-border bg-surface-2
            px-1.5 py-0.5 text-[11px] leading-none text-gray-400
          "
        >
          Esc
        </span>
      )}
    </div>
  );
}
