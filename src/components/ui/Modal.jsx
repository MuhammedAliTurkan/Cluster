export default function Modal({ open, onClose, title, children, footer, maxWidth = "640px" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full rounded-2xl border border-border-light bg-surface-2 shadow-2xl"
          style={{ maxWidth }}
        >
          <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface-3 rounded-t-2xl">
            <div className="font-semibold">{title}</div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/5 text-gray-300 hover:text-white"
              aria-label="Kapat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
          {footer && (
            <div className="px-5 py-3 border-t border-border bg-surface-2 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
