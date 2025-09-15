import { useChat } from "../../context/ChatContext";
import { useModals } from "../../context/ModalContext";

export default function SidebarServers() {
  const { servers, activeServerId, setActiveServerId } = useChat();
  const { openCreateServer } = useModals();

  return (
    <div className="w-16 bg-[#1A1A1A] border-r border-[#2a2a2a] flex flex-col items-center py-3 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#2B2B2B] grid place-items-center text-2xl hover:rounded-xl transition">🏠</div>
      <div className="h-[1px] w-8 bg-[#333]" />
      {servers.map(s => (
        <button
          key={s.id}
          onClick={() => setActiveServerId(s.id)}
          title={s.name}
          className={`w-12 h-12 grid place-items-center rounded-2xl transition
            ${activeServerId === s.id ? "rounded-xl bg-orange-500" : "bg-[#2B2B2B] hover:rounded-xl hover:bg-[#3A3A3A]"}`}
        >
          <span className="text-xl">{s.icon}</span>
        </button>
      ))}
      {/* yeni: sunucu oluştur */}
      <button
        onClick={openCreateServer}
        className="mt-auto mb-2 w-12 h-12 grid place-items-center rounded-2xl bg-[#2B2B2B] hover:bg-[#3A3A3A]"
        title="Sunucu Oluştur"
      >
        ＋
      </button>
    </div>
  );
}
