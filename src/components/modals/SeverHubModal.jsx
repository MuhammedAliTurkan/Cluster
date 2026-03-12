import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../../services/http";
import { serverApi } from "../../services/serverApi";

export default function ServerHubModal({ open, onClose, initialTab = "create", onCreated }) {
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!iconFile) { setIconPreview(""); return; }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modalCls = useMemo(() => `fixed inset-0 z-50`, []);

  if (!open) return null;

  const createServer = async () => {
    setLoading(true);
    try {
      await http.post("/api/servers", { name: name.trim(), description: desc.trim() || null, iconUrl: null, isPublic });
      setName("");
      setDesc("");
      setIsPublic(false);
      setIconFile(null);
      onCreated?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const previewInvite = async () => {
    const code = invite.trim().split("/").pop(); // URL veya kod kabul et
    if (!code) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await serverApi.previewInvite(code);
      setPreview(data);
    } catch (e) {
      alert(e.response?.data?.message || e.message || "Davet kodu geçersiz");
    } finally {
      setPreviewLoading(false);
    }
  };

  const joinServer = async () => {
    const code = invite.trim().split("/").pop();
    if (!code) return;
    setLoading(true);
    try {
      await serverApi.joinByCode(code);
      setInvite("");
      setPreview(null);
      onCreated?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={modalCls} aria-modal role="dialog" ref={dialogRef}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[min(700px,92vw)] rounded-2xl bg-[#202225] border border-[#2a2a2a] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="text-lg font-semibold text-white">Sunucu Merkezi</div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg bg-[#2b2d31] hover:bg-[#3a3d43] grid place-items-center"
            title="Kapat"
          ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-gray-300 hover:text-white"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
        </div>

        <div className="px-6 pt-4 flex gap-2">
          <button
            className={`px-3 py-2 rounded-md text-sm ${tab === "create" ? "bg-orange-500 text-white" : "bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]"}`}
            onClick={() => setTab("create")}
          >Sunucu Oluştur</button>
          <button
            className={`px-3 py-2 rounded-md text-sm ${tab === "join" ? "bg-orange-500 text-white" : "bg-[#2b2d31] text-gray-300 hover:bg-[#3a3d43]"}`}
            onClick={() => setTab("join")}
          >Sunucuya Katıl</button>
        </div>

        <div className="p-6">
          {tab === "create" ? (
            <div className="grid gap-4 md:grid-cols-[160px,1fr]">
              <div className="flex flex-col items-start gap-3">
                <div className="h-28 w-28 rounded-2xl bg-[#2b2d31] border border-[#3a3d43] overflow-hidden grid place-items-center">
                  {iconPreview ? <img src={iconPreview} alt="preview" className="h-full w-full object-cover" /> : <span className="text-gray-400">İkon</span>}
                </div>
                <label className="px-3 py-2 rounded-md bg-[#2b2d31] hover:bg-[#3a3d43] text-gray-200 cursor-pointer">
                  Resim Seç
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Sunucu adı</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Frontend TR"
                    className="w-full p-3 rounded-md bg-[#2b2d31] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Açıklama (opsiyonel)</label>
                  <input
                    value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Topluluk hakkında kısa bilgi"
                    className="w-full p-3 rounded-md bg-[#2b2d31] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-[#2b2d31] border border-[#3a3d43]">
                  <div>
                    <div className="text-sm text-white font-medium">Herkese Açık Sunucu</div>
                    <div className="text-xs text-gray-400 mt-0.5">Keşfet'te görünür, herkes katılabilir</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(p => !p)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-orange-500" : "bg-[#3a3d43]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-xl space-y-3">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Davet kodu</label>
                <div className="flex gap-2">
                  <input
                    value={invite} onChange={(e) => { setInvite(e.target.value); setPreview(null); }}
                    placeholder="aBcD1234"
                    className="flex-1 p-3 rounded-md bg-[#2b2d31] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                    onKeyDown={(e) => e.key === "Enter" && (preview ? joinServer() : previewInvite())}
                  />
                  {!preview && (
                    <button onClick={previewInvite} disabled={previewLoading || !invite.trim()}
                      className="px-4 rounded-md bg-[#2b2d31] hover:bg-[#3a3d43] text-gray-200 disabled:opacity-60">
                      {previewLoading ? "..." : "Ara"}
                    </button>
                  )}
                </div>
              </div>
              {preview && (
                <div className="p-4 rounded-lg bg-[#1e1f22] border border-[#3a3d43] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#2b2d31] grid place-items-center text-xl font-bold text-white shrink-0">
                    {preview.serverIcon
                      ? <img src={preview.serverIcon} alt="" className="w-full h-full object-cover rounded-xl" />
                      : preview.serverName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{preview.serverName}</div>
                    <div className="text-gray-400 text-xs">Davet: {preview.creatorName}</div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">Davet kodunu yapıştır, sunucuyu önizle ve katıl.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-[#2b2d31] hover:bg-[#3a3d43] text-gray-200">İptal</button>
          {tab === "create" ? (
            <button onClick={createServer} disabled={loading || !name.trim()} className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white">
              {loading ? "Oluşturuluyor…" : "Oluştur"}
            </button>
          ) : (
            <button onClick={joinServer} disabled={loading || !invite.trim()} className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white">
              {loading ? "Katılıyor…" : "Katıl"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
