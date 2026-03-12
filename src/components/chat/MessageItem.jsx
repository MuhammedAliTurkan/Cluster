export default function MessageItem({ msg }) {
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-[#1f1f1f]">
      <div className="w-10 h-10 rounded-full bg-[#2B2B2B] grid place-items-center flex-shrink-0 text-gray-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">{msg.author}</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        <div className="text-gray-200 break-words">{msg.content}</div>
      </div>
    </div>
  );
}
