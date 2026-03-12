import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { friendsApi } from "../services/friendsApi";
import dmApi from "../services/dmApi";

export default function Friends({ onNavigateSide }) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const list = await friendsApi.list();
        if (!ok) return;
        setFriends(Array.isArray(list) ? list : []);
      } catch {
        setFriends([]);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => (ok = false);
  }, []);

  const startDm = async (peerId) => {
    try {
      const ch = await dmApi.ensureWithParticipants([peerId]);
      nav(`/app/dm/${ch.id}`);
    } catch {
      alert("DM oluşturulamadı.");
    }
  };

  const submitAdd = async () => {
    if (!addUsername.trim()) return;
    try {
      const found = await friendsApi.lookupExact(addUsername.trim());
      if (!found?.id) return alert("Kullanıcı bulunamadı.");
      await friendsApi.sendRequest(found.id);
      alert("İstek gönderildi.");
      setOpenAdd(false);
      setAddUsername("");
    } catch {
      alert("İstek gönderilemedi.");
    }
  };

  return (
    <div className="h-full overflow-hidden bg-[#151a21] text-gray-100 flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-3 md:px-4 border-b border-[#232a35]">
        {/* mobilde DM/kanal listesi hızlı erişim */}
        <button
          onClick={onNavigateSide}
          className="md:hidden px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-sm"
        >
          Listeler
        </button>
        <div className="ml-auto" />
        <button
          onClick={() => setOpenAdd((v) => !v)}
          className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-sm"
        >
          + Arkadaş ekle
        </button>
      </div>

      {/* Add row */}
      {openAdd && (
        <div className="px-3 md:px-4 py-3 border-b border-[#232a35] flex items-center gap-2">
          <input
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            placeholder="@kullanıcıadı"
            className="flex-1 px-3 py-2 rounded bg-[#1d2530] border border-[#2b3545] outline-none"
          />
          <button onClick={submitAdd} className="px-3 py-2 rounded bg-orange-600 hover:bg-orange-500">
            Gönder
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-3 md:p-4 flex-1 overflow-y-auto min-w-0">
        <div className="text-xs md:text-sm mb-2 text-gray-400">Arkadaşlar</div>

        {loading && <div className="text-sm text-gray-400">Yükleniyor…</div>}
        {!loading && friends.length === 0 && <div className="text-sm text-gray-500">Henüz arkadaş yok.</div>}

        <div className="flex flex-col gap-1">
          {friends.map((f) => {
            const p = f.peer || {};
            const name = p.displayName || p.username || "Kullanıcı";
            const tag = p.username ? `@${p.username}` : "";
            return (
              <button
                key={f.relationId || p.id}
                onClick={() => startDm(p.id)}
                className="w-full text-left bg-[#1a212c] hover:bg-[#202a37] transition rounded-lg px-3 py-2.5 min-w-0 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-orange-600 grid place-items-center text-sm font-medium shrink-0">
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-sm">{name}</div>
                  <div className="text-xs text-gray-400 truncate">{tag}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
