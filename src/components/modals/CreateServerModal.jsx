import { useState } from "react";
import Modal from "../ui/Modal";
import { useModals } from "../../context/ModalContext";

export default function CreateServerModal() {
  const { createServerOpen, closeCreateServer } = useModals();
  const [form, setForm] = useState({ name: "", region: "eu-central", file: null });
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    setForm((f) => ({ ...f, [name]: files ? files[0] : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setOk(false);
    try {
      // TODO: backend entegrasyonu
      // const fd = new FormData();
      // fd.append("name", form.name);
      // fd.append("region", form.region);
      // if (form.file) fd.append("icon", form.file);
      // await fetch("/api/servers", { method: "POST", body: fd, credentials: "include" });
      console.log("Create Server payload:", form);
      await new Promise(r => setTimeout(r, 600));
      setOk(true);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={closeCreateServer}
        className="px-4 py-2 rounded-lg bg-[#2B2B2B] hover:bg-[#3A3A3A] border border-[#3A3A3A]"
      >
        İptal
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting || !form.name.trim()}
        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 font-semibold disabled:opacity-50"
      >
        {submitting ? "Oluşturuluyor…" : "Sunucu Oluştur"}
      </button>
    </div>
  );

  return (
    <Modal open={createServerOpen} onClose={closeCreateServer} title="Sunucu Oluştur" footer={footer} maxWidth="560px">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Sunucu Adı</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Topluluk adın"
            className="w-full bg-[#2B2B2B] border border-[#3A3A3A] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Bölge</label>
            <select
              name="region"
              value={form.region}
              onChange={onChange}
              className="w-full bg-[#2B2B2B] border border-[#3A3A3A] rounded-lg px-3 py-2"
            >
              <option value="eu-central">EU Central</option>
              <option value="eu-west">EU West</option>
              <option value="us-east">US East</option>
              <option value="us-west">US West</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Sunucu İkonu</label>
            <input
              type="file"
              name="file"
              accept="image/*"
              onChange={onChange}
              className="block w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#2B2B2B] file:text-gray-200 hover:file:bg-[#3A3A3A]"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          İkon opsiyoneldir. Oluşturduktan sonra ayarlardan değiştirebilirsin.
        </p>

        {ok && (
          <div className="text-sm text-green-400">
            ✅ Sunucu oluşturuldu (mock). Backend’e bağlayınca gerçek ID döndürebiliriz.
          </div>
        )}
      </form>
    </Modal>
  );
}
