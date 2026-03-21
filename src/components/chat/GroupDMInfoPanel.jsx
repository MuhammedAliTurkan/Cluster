// src/components/chat/GroupDMInfoPanel.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePresence } from "../../context/PresenceContext";
import { friendsApi } from "../../services/friendsApi";
import dmApi from "../../services/dmApi";
import Avatar from "../common/Avatar";
import ConfirmDialog from "../modals/ConfirmDialog";

export default function GroupDMInfoPanel({ channelId, channelData, onClose, onUpdated }) {
  const { user } = useAuth();
  const { getStatus } = usePresence();
  const nav = useNavigate();
  const meId = user?.id;

  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState([]);
  const [addSearch, setAddSearch] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmKick, setConfirmKick] = useState(null); // userId

  const isOwner = channelData?.owner?.id === meId;

  useEffect(() => {
    if (!channelId) return;
    dmApi.listDmMembers(channelId).then(setMembers).catch(() => setMembers([]));
  }, [channelId]);

  useEffect(() => {
    if (!showAddMember) return;
    friendsApi.list().then((list) => setFriends(Array.isArray(list) ? list : [])).catch(() => setFriends([]));
  }, [showAddMember]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const filteredFriends = useMemo(() => {
    const base = friends.filter((f) => !memberIds.has(f.peer?.id));
    if (!addSearch.trim()) return base;
    const q = addSearch.toLowerCase();
    return base.filter((f) => {
      const p = f.peer || {};
      return (p.displayName || "").toLowerCase().includes(q) || (p.username || "").toLowerCase().includes(q);
    });
  }, [friends, memberIds, addSearch]);

  const addMember = async (userId) => {
    try {
      await dmApi.addDmMember(channelId, userId);
      const updated = await dmApi.listDmMembers(channelId);
      setMembers(updated);
      onUpdated?.();
    } catch (e) { console.error("Add member error:", e); }
  };

  const kickMember = async () => {
    if (!confirmKick) return;
    try {
      await dmApi.removeDmMember(channelId, confirmKick);
      setMembers((prev) => prev.filter((m) => m.id !== confirmKick));
      onUpdated?.();
    } catch (e) { console.error("Kick error:", e); }
    setConfirmKick(null);
  };

  const saveTitle = async () => {
    if (!newTitle.trim()) { setEditing(false); return; }
    try {
      await dmApi.patchChannel(channelId, { title: newTitle.trim() });
      setEditing(false);
      onUpdated?.();
    } catch (e) { console.error("Rename error:", e); }
  };

  const leave = async () => {
    try {
      await dmApi.leaveDm(channelId);
      nav("/app/friends", { replace: true });
    } catch (e) { console.error("Leave error:", e); }
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 border-l border-border/50" style={{ width: 320, minWidth: 280 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-surface-2 shrink-0">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-400 shrink-0">
          <circle cx="6" cy="6" r="3"/><circle cx="11" cy="7" r="2.5"/><path d="M1 14c0-2.5 2-4 5-4s5 1.5 5 4"/>
        </svg>
        <span className="text-sm font-medium text-gray-200 flex-1">Grup Bilgileri</span>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {/* Grup ismi */}
      <div className="px-4 py-3 border-b border-border/30">
        {editing ? (
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditing(false); }}
              placeholder="Grup adi"
              maxLength={80}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border-light text-sm text-gray-100 outline-none focus:border-accent"
              autoFocus
            />
            <button onClick={saveTitle} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs">Kaydet</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-white flex-1 truncate">
              {channelData?.title || "Grup Sohbeti"}
            </span>
            {isOwner && (
              <button
                onClick={() => { setNewTitle(channelData?.title || ""); setEditing(true); }}
                className="p-1 text-gray-500 hover:text-white transition"
                title="Yeniden adlandir"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="text-[12px] text-gray-500 mt-1">{members.length} uye</div>
      </div>

      {/* Üye ekle butonu */}
      <div className="px-4 py-2 border-b border-border/30">
        <button
          onClick={() => setShowAddMember((p) => !p)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-3 transition text-sm text-gray-300"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-accent-light">
            <circle cx="8" cy="8" r="7"/><path d="M8 5v6M5 8h6" strokeLinecap="round"/>
          </svg>
          Uye Ekle
        </button>

        {showAddMember && (
          <div className="mt-2">
            <input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Arkadas ara..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border-light text-[12px] text-gray-100 placeholder-gray-500 outline-none focus:border-accent mb-2"
            />
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {filteredFriends.length === 0 ? (
                <div className="text-[11px] text-gray-500 text-center py-2">
                  {friends.length === 0 ? "Arkadas yok" : "Tum arkadaslar zaten uyedir"}
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const p = f.peer || {};
                  return (
                    <button
                      key={p.id}
                      onClick={() => addMember(p.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-3 transition"
                    >
                      <Avatar src={p.avatarUrl} name={p.displayName || p.username} size={24} />
                      <span className="text-[12px] text-gray-300 truncate flex-1 text-left">{p.displayName || p.username}</span>
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-accent-light shrink-0">
                        <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Üye listesi */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide px-1 mb-2">Uyeler — {members.length}</div>
        {members.map((m) => {
          const name = m.displayName || m.username || "?";
          const status = getStatus(m.id);
          const isMe = m.id === meId;
          const isMOwner = channelData?.owner?.id === m.id;
          return (
            <div key={m.id} className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-3/50 transition">
              <Avatar src={m.avatarUrl} name={name} size={28} status={status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] text-gray-200 truncate">{name}</span>
                  {isMOwner && (
                    <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded font-medium">SAHIP</span>
                  )}
                  {isMe && <span className="text-[9px] text-gray-500">(sen)</span>}
                </div>
                <div className="text-[10px] text-gray-500">@{m.username}</div>
              </div>
              {/* Kick butonu (sadece owner, kendini kickleyemez) */}
              {isOwner && !isMe && (
                <button
                  onClick={() => setConfirmKick(m.id)}
                  className="p-1 text-gray-600 hover:text-rose-400 transition hidden group-hover:block shrink-0"
                  title="Gruptan cikar"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Alt butonlar */}
      <div className="px-4 py-3 border-t border-border/50 shrink-0">
        <button
          onClick={() => setConfirmLeave(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm transition"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M10 2H13v12H10M6 8h7M11 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Gruptan Ayril
        </button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Gruptan Ayril"
        message="Bu grup sohbetinden ayrilmak istediginize emin misiniz?"
        confirmText="Ayril"
        cancelText="Vazgec"
        onConfirm={leave}
        onCancel={() => setConfirmLeave(false)}
      />
      <ConfirmDialog
        open={!!confirmKick}
        title="Uyeyi Cikar"
        message="Bu uyeyi gruptan cikarmak istediginize emin misiniz?"
        confirmText="Cikar"
        cancelText="Vazgec"
        onConfirm={kickMember}
        onCancel={() => setConfirmKick(null)}
      />
    </div>
  );
}
