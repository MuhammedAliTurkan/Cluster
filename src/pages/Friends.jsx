import { NavLink, Routes, Route, useNavigate } from "react-router-dom";
import DMList from "../components/chat/DMList";
import FriendRow from "../components/users/FriendRow";
import { useState } from "react";

const seedFriends = [
  { id: "f1", name: "Ada", status: "online" },
  { id: "f2", name: "Zed", status: "idle" },
  { id: "f3", name: "Kai", status: "offline" },
  { id: "f4", name: "Lia", status: "online" },
];

export default function Friends() {
  const [friends, setFriends] = useState(seedFriends);
  const [pending, setPending] = useState([{ id: "p1", name: "Nova", status: "pending" }]);
  const nav = useNavigate();

  const Tab = ({ to, children }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm ${
          isActive ? "bg-[#363636] text-white" : "text-gray-300 hover:bg-[#2B2B2B]"
        }`
      }
    >
      {children}
    </NavLink>
  );

  return (
    <div className="h-full grid" style={{ gridTemplateColumns: "280px 1fr" }}>
      {/* SOL: DM Listesi */}
      <aside className="h-full border-r border-[#2a2a2a] bg-[#202020] overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
            <span>🧑‍🤝‍🧑</span> <span>Arkadaşlar</span>
          </div>
          <button
            onClick={() => nav("/friends/add")}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-lg"
          >
            Arkadaş Ekle
          </button>
        </div>
        <DMList />
      </aside>

      {/* ORTA: İçerik */}
      <section className="flex flex-col h-full min-w-0">
        {/* üst friends bara benzer */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#333] bg-[#222]">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">Friends</span>
          </div>
          <input
            placeholder="Arkadaşlarda ara…"
            className="bg-[#2B2B2B] border border-[#3A3A3A] rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* sekmeler */}
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[#2a2a2a]">
          <Tab to="">Çevrimiçi</Tab>
          <Tab to="all">Tümü</Tab>
          <Tab to="pending">Bekleyen</Tab>
          <Tab to="blocked">Engellenen</Tab>
          <Tab to="add">Arkadaş Ekle</Tab>
        </div>

        {/* sekme içerikleri */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route
              index
              element={<List friends={friends.filter(f=>f.status!=="offline")} empty="Çevrimiçi arkadaş yok." />}
            />
            <Route
              path="all"
              element={<List friends={friends} empty="Hiç arkadaş ekli değil." />}
            />
            <Route
              path="pending"
              element={
                <div className="p-4 space-y-2">
                  {pending.length ? pending.map(p => (
                    <FriendRow key={p.id} data={p}>
                      <div className="ml-auto flex gap-2">
                        <button className="px-3 py-1 rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]">Reddet</button>
                        <button className="px-3 py-1 rounded bg-orange-600 hover:bg-orange-700">Kabul Et</button>
                      </div>
                    </FriendRow>
                  )) : <Empty text="Bekleyen istek yok." />}
                </div>
              }
            />
            <Route path="blocked" element={<Empty text="Engellenen kullanıcı yok." />} />
            <Route path="add" element={<AddFriend onAdd={(n)=>setPending(prev => [...prev, {id:crypto.randomUUID(), name:n, status:"pending"}])} />} />
          </Routes>
        </div>
      </section>
    </div>
  );
}

function List({ friends, empty }) {
  if (!friends.length) return <Empty text={empty} />;
  return (
    <div className="p-4 space-y-2">
      {friends.map(f => <FriendRow key={f.id} data={f} />)}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="h-full grid place-items-center text-gray-400">
      {text}
    </div>
  );
}

function AddFriend({ onAdd }) {
  const [name, setName] = useState("");
  return (
    <div className="p-6 max-w-xl">
      <h3 className="text-lg font-semibold mb-2">Kullanıcı adı ile ekle</h3>
      <p className="text-gray-400 mb-4 text-sm">Örn: <span className="text-gray-300">kullanici#1234</span></p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e)=>setName(e.target.value)}
          placeholder="kullanici#0000"
          className="flex-1 bg-[#2B2B2B] border border-[#3A3A3A] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={()=>{ if(name.trim()){ onAdd(name.trim()); setName(""); } }}
          className="px-4 rounded-lg bg-orange-600 hover:bg-orange-700 font-semibold"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
