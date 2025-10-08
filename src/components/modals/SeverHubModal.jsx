import { useEffect, useMemo, useRef, useState } from "react";

export default function ServerHubModal({ open, onClose, initialTab = "create", token }) {
  const [tab, setTab] = useState(initialTab); // 'create' | 'join'
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(false);
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

  if (!open) return null;

  const modalCls = useMemo(() => `fixed inset-0 z-50`, []);

  const createServer = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("description", desc);
      if (iconFile) form.append("icon", iconFile);
      const res = await fetch("http://localhost:8080/api/servers", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) throw new Error(`Sunucu oluşturulamadı (${res.status})`);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const joinServer = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/servers/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ invite: invite.trim() }),
      });
      if (!res.ok) throw new Error(`Sunucuya katılım başarısız (${res.status})`);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert(e.message);
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
          >✕</button>
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
              </div>
            </div>
          ) : (
            <div className="max-w-xl">
              <label className="block text-gray-300 text-sm mb-1">Davet / Sunucu linki</label>
              <input
                value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="https://…  veya  abc123"
                className="w-full p-3 rounded-md bg-[#2b2d31] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-2">Davet linkini yapıştır; doğrulanınca sunucuya katılırsın.</p>
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
