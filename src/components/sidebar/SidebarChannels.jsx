import { useChat } from "../../context/ChatContext";
import { Link } from "react-router-dom";
import { paths } from "../../routes/paths"; 

export default function SidebarChannels({ collapsed }) {
  const { activeServerId, activeChannelId, setActiveChannelId, lastVisitedByServer } = useChat();

  if (collapsed) {
    return <div className="w-60 bg-[#2b2d31] hidden md:block" />; // boş yer tutucu
  }

  // TODO: aktif sunucunun kanallarını backend'den çek
  const channels = [
    { id: "c1", name: "genel", type: "TEXT" },
    { id: "c2", name: "sohbet", type: "TEXT" },
  ];

  return (
    <div className="w-60 bg-[#2b2d31] border-r border-[#232428] p-3 overflow-y-auto">
      <div className="text-gray-300 text-xs mb-2 uppercase">Kanallar</div>
      <div className="flex flex-col gap-1">
        {channels.map((ch) => (
          <Link
            key={ch.id}
            to={paths.chat}
            onClick={() => setActiveChannelId(ch.id)}
            className={`px-2 py-1 rounded hover:bg-[#3a3d43] transition ${
              activeChannelId === ch.id ? "bg-[#3a3d43] text-white" : "text-gray-300"
            }`}
          >
            # {ch.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
