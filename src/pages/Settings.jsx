import { NavLink, Routes, Route } from "react-router-dom";
import { useState } from "react";
import BackButton from "../components/ui/BackButton"; // 👈 eklendi

export default function Settings() {
  const Item = ({ to, children }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-sm ${
          isActive ? "bg-[#363636] text-white" : "text-gray-300 hover:bg-[#2B2B2B]"
        }`
      }
    >
      {children}
    </NavLink>
  );

  return (
    <div className="h-full grid" style={{ gridTemplateColumns: "260px 1fr" }}>
      {/* sol */}
      <aside className="h-full border-r border-[#2a2a2a] bg-[#202020] overflow-y-auto p-3">
        <div className="text-gray-400 text-[11px] tracking-wider px-1 mb-1">KULLANICI AYARLARI</div>
        <div className="space-y-1">
          <Item to="">Hesabım</Item>
          <Item to="privacy">Gizlilik & Güvenlik</Item>
          <Item to="voice">Ses & Video</Item>
          <Item to="notifications">Bildirimler</Item>
          <Item to="appearance">Görünüm</Item>
        </div>
      </aside>

      {/* sağ */}
      <section className="h-full overflow-y-auto">
        {/* ÜST BAR + GERİ */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#333] bg-[#222]">
  <div className="flex items-center gap-3">
    <BackButton className="" label="Ayarlar’a geri dön" showLabel={false} />
    <span className="font-semibold">Ayarlar</span>
  </div>
  <div className="text-sm text-gray-400 hidden sm:block">Esc ile çık</div>
</div>

        <Routes>
          <Route index element={<Account />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="voice" element={<VoiceVideo />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="appearance" element={<Appearance />} />
        </Routes>
      </section>
    </div>
  );
}

/* … aşağıdaki Section/Row ve paneller aynı … */
function Section({ title, children }) { /* değişmedi */ 
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Row({ label, children }) { /* değişmedi */
  return (
    <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3">
      <div className="min-w-[160px] text-sm text-gray-300">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function Account(){/* değişmedi */} 
function Privacy(){/* değişmedi */} 
function VoiceVideo(){/* değişmedi */} 
function Notifications(){/* değişmedi */} 
function Appearance(){/* değişmedi */}
