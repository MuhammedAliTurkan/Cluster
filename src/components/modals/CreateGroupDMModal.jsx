// src/components/modals/CreateGroupDMModal.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { friendsApi } from "../../services/friendsApi";
import { usePresence } from "../../context/PresenceContext";
import dmApi from "../../services/dmApi";
import Avatar from "../common/Avatar";

export default function CreateGroupDMModal({ open, onClose }) {
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]); // userId[]
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const nav = useNavigate();
  const { getStatus } = usePresence();

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setGroupName("");
    setSearch("");
    friendsApi.list().then((list) => setFriends(Array.isArray(list) ? list : [])).catch(() => setFriends([]));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter((f) => {
      const p = f.peer || {};
      return (p.displayName || "").toLowerCase().includes(q)
        || (p.username || "").toLowerCase().includes(q);
    });
  }, [friends, search]);

  const toggle = (userId) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const create = async () => {
    if (selected.length < 1) return;
    setCreating(true);
    try {
      if (selected.length === 1) {
        // 1:1 DM
        const ch = await dmApi.ensureWithParticipants(selected);
        window.dispatchEvent(new CustomEvent("open-dm-chat", { detail: { channelId: ch.id } }));
        nav(`/app/dm/${ch.id}`);
      } else {
        // Grup DM
        const ch = await dmApi.ensureWithParticipants(selected, {
          title: groupName.trim() || undefined,
          reuseForGroup: false,
        });
        window.dispatchEvent(new CustomEvent("open-dm-chat", { detail: { channelId: ch.id } }));
        nav(`/app/dm/${ch.id}`);
      }
      onClose();
    } catch (e) {
      console.error("Group DM create error:", e);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[99998]" onClick={onClose} />
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div className="bg-surface-2 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md max-h-[80vh] flex flex-col border border-border-light">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold text-white">Yeni Mesaj</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">
              {selected.length > 1 ? "Grup sohbeti oluşturuluyor" : "Kişi seçin veya grup oluşturun"}
            </p>
          </div>

          {/* Grup ismi (2+ kişi seçildiğinde) */}
          {selected.length > 1 && (
            <div className="px-5 pb-2">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Grup adı (opsiyonel)"
                maxLength={80}
                className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-accent"
              />
            </div>
          )}

          {/* Seçilenler */}
          {selected.length > 0 && (
            <div className="px-5 pb-2 flex flex-wrap gap-1.5">
              {selected.map((uid) => {
                const f = friends.find((fr) => fr.peer?.id === uid);
                const name = f?.peer?.displayName || f?.peer?.username || "?";
                return (
                  <button
                    key={uid}
                    onClick={() => toggle(uid)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent-light text-[12px] hover:bg-accent/30 transition"
                  >
                    <span>{name}</span>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                      <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}

          {/* Arama */}
          <div className="px-5 pb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Arkadaş ara..."
              className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {/* Arkadaş listesi */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                {friends.length === 0 ? "Henuz arkadas yok" : "Sonuc bulunamadi"}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((f) => {
                  const p = f.peer || {};
                  const name = p.displayName || p.username || "?";
                  const isSelected = selected.includes(p.id);
                  const status = getStatus(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        isSelected ? "bg-accent/15 ring-1 ring-accent/30" : "hover:bg-surface-3"
                      }`}
                    >
                      <Avatar src={p.avatarUrl} name={name} size={36} status={status} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-200 truncate">{name}</div>
                        <div className="text-[11px] text-gray-500 truncate">@{p.username}</div>
                      </div>
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition ${
                        isSelected ? "bg-accent border-accent" : "border-gray-500"
                      }`}>
                        {isSelected && (
                          <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" className="w-3 h-3">
                            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border/50 flex items-center justify-between">
            <span className="text-[12px] text-gray-500">
              {selected.length} kisi secildi
              {selected.length > 1 && " (grup)"}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition">
                Vazgec
              </button>
              <button
                onClick={create}
                disabled={selected.length === 0 || creating}
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? "Olusturuluyor..." : selected.length > 1 ? "Grup Olustur" : "Mesaj Gonder"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
