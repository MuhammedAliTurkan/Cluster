import { useState } from "react";
import { postApi } from "../../services/postApi";
import toast from "react-hot-toast";

export default function CreatePostModal({ serverId, onCreated, onClose }) {
  const [description, setDescription] = useState("");
  const visibility = "SERVER"; // Sunucu içi oluşturulur, public yapmak ayrı onay gerektirir
  const [files, setFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (newFiles) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)].slice(0, 10));
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (files.length === 0) return;
    setCreating(true);
    try {
      await postApi.createPost(serverId, { description, visibility, images: files });
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Gönderme hatası");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[99998]" onClick={onClose} />
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div className="bg-surface-2 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg max-h-[85vh] flex flex-col border border-border-light">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold text-white">Yeni Gönderi</h2>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {/* Görsel yükleme */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
                dragOver ? "border-accent bg-accent/5" : "border-border-light hover:border-gray-500"
              }`}
            >
              {files.length === 0 ? (
                <label className="cursor-pointer flex flex-col items-center gap-2 py-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-500">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-sm text-gray-400">Görsel yükle veya sürükle</span>
                  <span className="text-[11px] text-gray-600">Maks 10 görsel, 50MB/görsel</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
                </label>
              ) : (
                <div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {files.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >×</button>
                        {i === 0 && (
                          <span className="absolute bottom-0.5 left-0.5 bg-accent text-white text-[8px] px-1 rounded font-bold">KAPAK</span>
                        )}
                      </div>
                    ))}
                    {files.length < 10 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-border-light hover:border-gray-500 flex items-center justify-center cursor-pointer transition">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500">
                          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                        </svg>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
                      </label>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500">{files.length}/10 görsel</div>
                </div>
              )}
            </div>

            {/* Açıklama */}
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Açıklama yaz..."
                maxLength={2000}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-3 border border-border-light text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-accent resize-none"
              />
              <div className="text-[10px] text-gray-600 text-right mt-0.5">{description.length}/2000</div>
            </div>

            {/* Görünürlük bilgi */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-3 border border-border-light/50">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-400 shrink-0"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
              <div>
                <div className="text-sm text-gray-300">Sunucu İçi Gönderi</div>
                <div className="text-[10px] text-gray-500">Keşfette görünmesi için paylaşıldıktan sonra public isteği gönderin. Sahip + moderatör onayı gerekir.</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border/50 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition">
              Vazgeç
            </button>
            <button
              onClick={submit}
              disabled={files.length === 0 || creating}
              className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-medium transition disabled:opacity-40"
            >
              {creating ? "Gönderiliyor..." : "Paylaş"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
