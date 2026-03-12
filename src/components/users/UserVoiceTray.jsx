import { useState } from "react";

export default function UserVoiceTray() {
  const [muted, setMuted] = useState(false);
  const [deaf, setDeaf] = useState(false);

  return (
    <div className="w-full p-2">
      <div className="flex items-center gap-2 bg-[#1d1d1d] border border-[#2a2a2a] rounded-xl px-2 py-2">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-[#2B2B2B] grid place-items-center text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
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
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <rect x="9" y="1" width="6" height="11" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v4m-4 0h8" />
          </svg>
        </IconBtn>
        <IconBtn
          active={deaf}
          onClick={()=>setDeaf(v=>!v)}
          title={deaf ? "Sesi aç" : "Sesi kapat"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7z" /><path d="M21 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-7z" /><path d="M3 14v-2a9 9 0 1 1 18 0v2" />
          </svg>
        </IconBtn>
        <IconBtn title="Kullanıcı Ayarları">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </IconBtn>
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
