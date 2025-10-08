import { useState } from "react";

export default function UserVoiceTray() {
  const [muted, setMuted] = useState(false);
  const [deaf, setDeaf] = useState(false);

  return (
    <div className="w-full p-2">
      <div className="flex items-center gap-2 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl px-2 py-2">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-[#2B2B2B] grid place-items-center">👤</div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[#1d1d1d] ${muted||deaf ? "bg-gray-500" : "bg-green-500"}`} />
        </div>
        <div className="min-w-0 mr-auto">
          <div className="text-sm">Sen</div>
          <div className="text-[11px] text-gray-400">{muted ? "Mikrofon kapalı" : deaf ? "Kulaklık kapalı" : "Çevrimiçi"}</div>
        </div>
        <IconBtn
          active={muted}
          onClick={()=>setMuted(v=>!v)}
          title={muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
        >🎙️</IconBtn>
        <IconBtn
          active={deaf}
          onClick={()=>setDeaf(v=>!v)}
          title={deaf ? "Sesi aç" : "Sesi kapat"}
        >🎧</IconBtn>
        <IconBtn title="Kullanıcı Ayarları">⚙️</IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, active, ...rest }) {
  return (
    <button
      {...rest}
      className={`h-8 w-8 grid place-items-center rounded-lg border text-sm
        ${active
          ? "bg-orange-600 border-orange-600 text-white"
          : "bg-[#2B2B2B] border-[#3A3A3A] text-gray-200 hover:bg-[#3A3A3A]"}`}
    >
      {children}
    </button>
  );
}
