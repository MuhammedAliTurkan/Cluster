import { useEffect, useRef } from "react";
import Modal from "../ui/Modal";

export default function IncomingCallModal({ open, onClose, invite, onAccept, onDecline }) {
  // Zil sesi — modal açıkken çalar, kapanınca durur
  const ringRef = useRef(null);
  useEffect(() => {
    if (open) {
      try {
        if (!ringRef.current) ringRef.current = new Audio("/sounds/ringtone.mp3");
        ringRef.current.loop = true;
        ringRef.current.volume = 0.6;
        ringRef.current.currentTime = 0;
        ringRef.current.play().catch(() => {});
      } catch {}
    } else {
      if (ringRef.current) {
        ringRef.current.pause();
        ringRef.current.currentTime = 0;
      }
    }
    return () => {
      if (ringRef.current) {
        ringRef.current.pause();
        ringRef.current.currentTime = 0;
      }
    };
  }, [open]);
  const fromName =
    invite?.from?.displayName || invite?.from?.fullName || invite?.from?.username || invite?.from?.name || "Bilinmeyen";
  const room = invite?.roomId || invite?.raw?.room || invite?.raw?.room_id || invite?.raw?.channelId;

  return (
    <Modal
      open={!!open}
      onClose={onClose}
      title="Gelen Arama"
      maxWidth="420px"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onDecline}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
          >
            Reddet
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            Kabul Et
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="text-sm text-gray-300">{fromName} seni arıyor.</div>
        {room && (
          <div className="text-xs text-gray-500">Oda: {String(room)}</div>
        )}
      </div>
    </Modal>
  );
}

