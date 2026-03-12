export default function FriendRow({ data, children }) {
  const badge =
    data.status === "online" ? "bg-green-500" :
    data.status === "idle" ? "bg-yellow-500" :
    data.status === "pending" ? "bg-orange-600" :
    "bg-gray-500";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#202020] border border-[#2a2a2a] hover:bg-[#242424]">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-[#2B2B2B] grid place-items-center text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[#202020] ${badge}`} />
      </div>
      <div className="min-w-0">
        <div className="font-medium">{data.name}</div>
        <div className="text-xs text-gray-400">Durum: {data.status}</div>
      </div>
      <div className="ml-auto flex gap-2">
        <button className="px-3 py-1 rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]">Mesaj</button>
        <button className="px-3 py-1 rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]">Ara</button>
        <button className="px-3 py-1 rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]">Profil</button>
      </div>
      {children}
    </div>
  );
}
