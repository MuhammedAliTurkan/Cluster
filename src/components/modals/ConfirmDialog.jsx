import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, message, confirmText = "Evet", cancelText = "İptal", onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-surface-2 rounded-xl border border-white/10 shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="text-white font-semibold text-base mb-2">{title}</h3>}
        <p className="text-gray-300 text-sm mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          {cancelText && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm bg-surface-3 text-gray-300 hover:bg-surface-5 transition"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent-dark transition font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
