import { useState, useEffect } from "react";
import { friendsApi } from "../../services/friendsApi";
import dmApi from "../../services/dmApi";
import { publishApp } from "../../services/ws";
import Avatar from "../common/Avatar";
import Modal from "../ui/Modal";
import toast from "react-hot-toast";

export default function OutgoingCallModal({ open, onClose, data }) {
  const text = data?.mode === "VOICE" ? "Sesli arama" : "Goruntulu arama";
  const [showAdd, setShowAdd] = useState(false);
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null);

  // Arkadas listesini yukle
  useEffect(() => {
    if (!showAdd) return;
    friendsApi.list().then((list) => setFriends(Array.isArray(list) ? list : [])).catch(() => {});
  }, [showAdd]);

  const addToCall = async (peerId, peerName) => {
    if (!data?.channelId || adding) return;
    setAdding(peerId);
    try {
      // Grup DM'e ekle
      await dmApi.addDmMember(data.channelId, peerId);
      // Invite gonder
      publishApp("/app/call.invite", { channelId: data.channelId, mode: data.mode || "VOICE" });
      toast.success(`${peerName} aramaya eklendi`);
      setShowAdd(false);
    } catch (e) {
      // Zaten uye olabilir, sadece invite gonder
      try {
        publishApp("/app/call.invite", { channelId: data.channelId, mode: data.mode || "VOICE" });
        toast.success(`${peerName} aramaya davet edildi`);
        setShowAdd(false);
      } catch { toast.error("Eklenemedi"); }
    }
    setAdding(null);
  };

  const filtered = search.trim()
    ? friends.filter((f) => {
        const q = search.toLowerCase();
        return (f.peer?.displayName || "").toLowerCase().includes(q)
          || (f.peer?.username || "").toLowerCase().includes(q);
      })
    : friends;

  return (
    <Modal
      open={!!open}
      onClose={onClose}
      title={text}
      maxWidth="420px"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setShowAdd((p) => !p)}
            className="px-3 py-2 rounded-lg bg-surface-4 hover:bg-surface-5 text-gray-300 text-sm flex items-center gap-1.5 transition"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <circle cx="6" cy="5" r="3"/><path d="M2 14c0-2.5 1.8-4 4-4s4 1.5 4 4"/><path d="M12 5v4M10 7h4" strokeLinecap="round"/>
            </svg>
            Kisi Ekle
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm"
          >
            Iptal
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
        <div className="text-sm text-gray-300">Karsi tarafin yaniti bekleniyor...</div>
      </div>

      {/* Kisi ekle paneli */}
      {showAdd && (
        <div className="border-t border-border-light pt-3 mt-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Arkadas ara..."
            className="w-full bg-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none border border-border-light focus:border-accent mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-3">Arkadas bulunamadi</div>
            )}
            {filtered.map((f) => {
              const p = f.peer || {};
              const name = p.displayName || p.username || "?";
              return (
                <button
                  key={p.id}
                  onClick={() => addToCall(p.id, name)}
                  disabled={adding === p.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-4 transition text-left disabled:opacity-50"
                >
                  <Avatar src={p.avatarUrl} name={name} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{name}</div>
                    <div className="text-[11px] text-gray-500 truncate">@{p.username}</div>
                  </div>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-500 shrink-0">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
