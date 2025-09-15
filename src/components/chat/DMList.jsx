import { useState } from "react";

const seedDMs = [
  { id: "d1", name: "Ada", last: "yarın görüşürüz", unread: 2 },
  { id: "d2", name: "Zed", last: "deploy ok", unread: 0 },
  { id: "d3", name: "Kai", last: "mock api hazır", unread: 5 },
];

export default function DMList() {
  const [dms] = useState(seedDMs);
  return (
    <div className="px-2 pb-3 space-y-1">
      <div className="px-2 text-[11px] tracking-wider text-gray-400 mb-1">DOĞRUDAN MESAJLAR</div>
      {dms.map(dm => (
        <button key={dm.id}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-300 hover:bg-[#2B2B2B]">
          <span className="w-8 h-8 rounded-full bg-[#2B2B2B] grid place-items-center">👤</span>
          <div className="flex-1 text-left min-w-0">
            <div className="truncate">{dm.name}</div>
            <div className="text-[11px] text-gray-500 truncate">{dm.last}</div>
          </div>
          {!!dm.unread && (
            <span className="ml-auto text-[11px] bg-orange-600 rounded-full px-2 py-0.5">{dm.unread}</span>
          )}
        </button>
      ))}
    </div>
  );
}
