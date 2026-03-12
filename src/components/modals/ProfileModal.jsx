import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../services/userApi";
import Avatar from "../common/Avatar";

export default function ProfileModal({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName || "");
    }
  }, [open, user]);

  if (!open) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await userApi.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Avatar yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateMe({ displayName: displayName.trim() || null });
      await refreshUser();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Profil güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[min(440px,92vw)] rounded-2xl bg-[#202225] border border-[#2a2a2a] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <span className="text-lg font-semibold text-white">Profil</span>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-[#2b2d31] hover:bg-[#3a3d43] grid place-items-center text-gray-300 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Avatar */}
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <Avatar src={user?.avatarUrl} name={user?.displayName || user?.username} size={96} />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100
                            grid place-items-center transition-opacity text-white text-xs font-medium">
              {uploading ? "..." : "Değiştir"}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="text-sm text-gray-400">@{user?.username}</div>

          {/* Display Name */}
          <div className="w-full">
            <label className="block text-gray-300 text-sm mb-1">Görünen Ad</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user?.username}
              className="w-full p-3 rounded-md bg-[#2b2d31] text-white border border-[#3a3d43]
                         focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Email (readonly) */}
          <div className="w-full">
            <label className="block text-gray-300 text-sm mb-1">E-posta</label>
            <div className="p-3 rounded-md bg-[#2b2d31] text-gray-400 border border-[#3a3d43] text-sm">
              {user?.email}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-[#2b2d31] hover:bg-[#3a3d43] text-gray-200">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
