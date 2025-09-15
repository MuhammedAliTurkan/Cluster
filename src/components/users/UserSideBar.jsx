const members = [
  { id: "u1", name: "Ada", status: "online" },
  { id: "u2", name: "Zed", status: "idle" },
  { id: "u3", name: "Kai", status: "dnd" },
];

export default function UserSideBar() {
  return (
    <aside className="w-64 bg-[#202020] border-l border-[#2a2a2a] hidden xl:flex flex-col">
      <div className="px-3 py-2 border-b border-[#2a2a2a] text-sm text-gray-300">Üyeler</div>
      <div className="p-3 space-y-2 overflow-y-auto">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#2B2B2B] grid place-items-center">👤</span>
            <div className="flex-1">
              <div className="text-sm">{m.name}</div>
              <div className="text-xs text-gray-400">{statusText(m.status)}</div>
            </div>
            <span className="text-gray-400">⋯</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function statusText(s) {
  return s === "online" ? "Çevrimiçi" : s === "idle" ? "Boşta" : "Rahatsız Etmeyin";
}
