import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { useModals } from "../../context/ModalContext";
import { useChat } from "../../context/ChatContext";

export default function CreateChannelModal() {
  const { createChannelOpen, closeCreateChannel, channelPreset } = useModals();
  const { channels } = useChat();

  const [form, setForm] = useState({
    name: "",
    type: channelPreset.type || "text",
    private: false,
    categoryId: channelPreset.categoryId || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      type: channelPreset.type || "text",
      categoryId: channelPreset.categoryId || "",
    }));
  }, [channelPreset]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true); setOk(false);
    try {
      // TODO: backend entegrasyonu
      // await fetch(`/api/servers/${serverId}/channels`, { method:"POST", body:JSON.stringify(form) })
      console.log("Create Channel payload:", form);
      await new Promise(r => setTimeout(r, 600));
      setOk(true);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={closeCreateChannel}
        className="px-4 py-2 rounded-lg bg-surface-3 hover:bg-surface-5 border border-border-light"
      >
        İptal
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting || !form.name.trim()}
        className="px-4 py-2 rounded-lg bg-accent-dark hover:bg-emerald-700 font-semibold disabled:opacity-50"
      >
        {submitting ? "Oluşturuluyor…" : "Kanal Oluştur"}
      </button>
    </div>
  );

  // Örnek kategori/kanal gruplaması yoksa dropdown’ı basit tutuyoruz:
  const categoryOptions = [
    { id: "", name: "Kategorisiz" },
    // ileride gerçek kategoriler eklendiğinde doldurursun
  ];

  return (
    <Modal open={createChannelOpen} onClose={closeCreateChannel} title="Kanal Oluştur" footer={footer} maxWidth="560px">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Kanal tipi */}
        <div className="flex gap-2">
          <TypePill selected={form.type==="text"} onClick={()=>setForm(f=>({ ...f, type:"text" }))} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 9h3l3-3v12l-3-3H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" /></svg>} label="Metin" />
          <TypePill selected={form.type==="voice"} onClick={()=>setForm(f=>({ ...f, type:"voice" }))} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>} label="Ses" />
          <TypePill selected={form.type==="video"} onClick={()=>setForm(f=>({ ...f, type:"video" }))} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>} label="Video" />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Kanal Adı</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="genel, duyurular, standup…"
            className="w-full bg-surface-3 border border-border-light rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Kategori</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={onChange}
              className="w-full bg-surface-3 border border-border-light rounded-lg px-3 py-2"
            >
              {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

            {/* Örnek: dm/özel kanal */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" name="private" checked={form.private} onChange={onChange} />
              Özel kanal (sadece belirli roller/kullanıcılar)
            </label>
          </div>
        </div>

        {ok && (
          <div className="text-sm text-green-400">
            Kanal oluşturuldu (mock).
          </div>
        )}
      </form>
    </Modal>
  );
}

function TypePill({ selected, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-2
        ${selected
          ? "border-accent bg-accent-dark/10 text-accent-light"
          : "border-border-light bg-surface-3 text-gray-300 hover:bg-surface-5"}`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
