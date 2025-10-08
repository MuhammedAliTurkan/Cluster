import { useState } from "react";
import { useModals } from "../../context/ModalContext";

export default function CreateServerModal() {
  const { createServerOpen, closeCreateServer } = useModals();
  const [name, setName] = useState("");

  if (!createServerOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-[#2B2B2B] w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#3A3A3A]">
        <h2 className="text-xl font-semibold text-white mb-4">Yeni Sunucu</h2>
        <input
          value={name}
          onChange={(e)=>setName(e.target.value)}
          placeholder="Sunucu adı"
          className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
        />
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={closeCreateServer}
            className="px-4 py-2 rounded-md bg-[#3A3A3A] text-gray-200 hover:bg-[#444]"
          >
            İptal
          </button>
          <button
            onClick={() => {
              // TODO: backend'e POST /api/servers
              console.log("create server:", name);
              closeCreateServer();
            }}
            className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white"
          >
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
