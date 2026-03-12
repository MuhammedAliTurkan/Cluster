import Modal from "../ui/Modal";

export default function OutgoingCallModal({ open, onClose, data }) {
  const text = data?.mode === "VOICE" ? "Sesli arama" : "Görüntülü arama";
  return (
    <Modal
      open={!!open}
      onClose={onClose}
      title={text}
      maxWidth="420px"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
          >
            İptal
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
        <div className="text-sm text-gray-300">Karşı tarafın yanıtı bekleniyor…</div>
      </div>
    </Modal>
  );
}

