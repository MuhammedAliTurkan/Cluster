export default function Modal({ open, onClose, title, children, footer, maxWidth = "640px" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full rounded-2xl border border-[#333] bg-[#1E1E1E] shadow-2xl"
          style={{ maxWidth }}
        >
          <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a2a] bg-[#222] rounded-t-2xl">
            <div className="font-semibold">{title}</div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/5 text-gray-300 hover:text-white"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          <div className="p-5">{children}</div>
          {footer && (
            <div className="px-5 py-3 border-t border-[#2a2a2a] bg-[#1b1b1b] rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
