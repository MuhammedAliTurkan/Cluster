import { useChat } from "../../context/ChatContext";
import { useNavigate } from "react-router-dom";
import { useModals } from "../../context/ModalContext";

export default function SidebarChannels() {
  const { channels, activeChannelId, setActiveChannelId } = useChat();
  const nav = useNavigate();
  const { openCreateChannel } = useModals();

  const go = (ch) => {
    setActiveChannelId(ch.id);
    if (ch.type === "voice") nav(`/app/voice/${ch.id}`);
    else if (ch.type === "video") nav(`/app/video/${ch.id}`);
    else nav("/app");
  };

  return (
    <aside className="w-60 bg-[#202020] border-r border-[#2a2a2a] flex flex-col">
      <div className="px-3 py-2 border-b border-[#2a2a2a] text-sm text-gray-300 flex items-center justify-between">
        <span>Sunucu Adı</span>
        <button
          onClick={()=>openCreateChannel({ type: "text" })}
          className="h-6 w-6 grid place-items-center rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]"
          title="Kanal Oluştur"
        >＋</button>
      </div>

      <div className="p-2 flex-1 overflow-y-auto space-y-3">
        <Section title="METİN KANALLARI" onAdd={()=>openCreateChannel({ type:"text" })}>
          {channels.filter(c=>c.type==="text").map(ch => (
            <ChannelRow key={ch.id} active={activeChannelId===ch.id} onClick={()=>go(ch)} icon="#"> {ch.name}</ChannelRow>
          ))}
        </Section>

        <Section title="SES KANALLARI" onAdd={()=>openCreateChannel({ type:"voice" })}>
          {channels.filter(c=>c.type==="voice").map(ch => (
            <ChannelRow key={ch.id} active={activeChannelId===ch.id} onClick={()=>go(ch)} icon="🔊"> {ch.name}</ChannelRow>
          ))}
        </Section>

        <Section title="VİDEO ODALARI" onAdd={()=>openCreateChannel({ type:"video" })}>
          {channels.filter(c=>c.type==="video").map(ch => (
            <ChannelRow key={ch.id} active={activeChannelId===ch.id} onClick={()=>go(ch)} icon="🎥"> {ch.name}</ChannelRow>
          ))}
        </Section>
      </div>

      <div className="p-2 border-t border-[#2a2a2a] text-sm text-gray-300">
        Profil & Ayarlar
      </div>
    </aside>
  );
}

function Section({ title, onAdd, children }) {
  return (
    <div>
      <div className="px-2 text-[11px] tracking-wider text-gray-400 flex items-center justify-between">
        <span>{title}</span>
        <button onClick={onAdd} className="text-gray-400 hover:text-white">＋</button>
      </div>
      <div className="mt-1 space-y-1">{children}</div>
    </div>
  );
}

function ChannelRow({ icon, children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm
       ${active ? "bg-[#363636] text-white" : "text-gray-300 hover:bg-[#2B2B2B] hover:text-white"}`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}
