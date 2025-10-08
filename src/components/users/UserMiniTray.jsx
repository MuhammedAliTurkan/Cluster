import { useState } from "react";

export default function UserMiniTray() {
  const [muted, setMuted] = useState(false);
  const [deaf, setDeaf]   = useState(false);

  const IconBtn = ({ active, title, children, onClick }) => (
    <button
      title={title}
      onClick={onClick}
      className={`h-9 w-9 grid place-items-center rounded-xl border text-sm
        ${active
          ? "bg-orange-600 border-orange-600 text-white"
          : "bg-[#2B2B2B] border-[#3A3A3A] text-gray-200 hover:bg-[#3A3A3A]"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-2 pb-2">
      <div className="w-10 h-10 rounded-2xl bg-[#2B2B2B] grid place-items-center text-lg">👤</div>
      <IconBtn active={muted} title={muted ? "Mikrofonu aç" : "Mikrofonu kapat"} onClick={()=>setMuted(v=>!v)}>🎙️</IconBtn>
      <IconBtn active={deaf}  title={deaf  ? "Sesi aç"      : "Sesi kapat"}      onClick={()=>setDeaf(v=>!v)}>🎧</IconBtn>
      <IconBtn title="Ayarlar">⚙️</IconBtn>
    </div>
  );
}