import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { serverApi } from "../../services/serverApi";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-amber-400">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function ChannelPermissionsModal({ channelId, channelName, serverId, onClose }) {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]); // { roleId, canRead, canWrite, canManage }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!channelId || !serverId) return;
    Promise.all([
      serverApi.listRoles(serverId),
      serverApi.getChannelPermissions(channelId).catch(() => []),
    ]).then(([roleList, permList]) => {
      // Filter out OWNER role (managed)
      const filtered = (roleList || []).filter((r) => !r.managed);
      setRoles(filtered);

      // Build permission map — default is all allowed (no record = visible)
      const permMap = {};
      for (const p of permList) {
        permMap[p.roleId] = { canRead: p.canRead, canWrite: p.canWrite, canManage: p.canManage };
      }

      // For roles without explicit permission, default to all true
      const result = filtered.map((r) => ({
        roleId: r.id,
        canRead: permMap[r.id]?.canRead ?? true,
        canWrite: permMap[r.id]?.canWrite ?? true,
        canManage: permMap[r.id]?.canManage ?? false,
      }));
      setPerms(result);
    }).finally(() => setLoading(false));
  }, [channelId, serverId]);

  const togglePerm = (roleId, field) => {
    setPerms((prev) =>
      prev.map((p) => (p.roleId === roleId ? { ...p, [field]: !p[field] } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send permissions that differ from default (canRead=true, canWrite=true, canManage=false)
      // But simpler: send all permissions
      await serverApi.setChannelPermissions(channelId, perms);
      onClose();
    } catch (e) {
      console.error("Failed to save permissions:", e);
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (roleId) => roles.find((r) => r.id === roleId)?.name || "?";
  const getRoleColor = (roleId) => roles.find((r) => r.id === roleId)?.color || "#99aab5";

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]" onClick={onClose}>
      <div className="bg-surface-3 rounded-xl border border-border-light/30 w-full max-w-lg p-6 mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <LockIcon />
          <div>
            <h2 className="text-lg font-semibold text-white">Kanal Izinleri</h2>
            <p className="text-[13px] text-gray-400">#{channelName}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white text-xl">&times;</button>
        </div>

        <p className="text-[12px] text-gray-500 mb-4">
          Hangi rollerin bu kanali gorebilecegini, yazabilecegini ve yonetebilecegini secin.
          Izin kaydı olmayan roller varsayilan olarak kanali gorebilir.
        </p>

        {/* Role list */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Rol bulunamadi</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1">
            {/* Table header */}
            <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-500 uppercase tracking-wider">
              <span className="flex-1">Rol</span>
              <span className="w-16 text-center">Gor</span>
              <span className="w-16 text-center">Yaz</span>
              <span className="w-16 text-center">Yonet</span>
            </div>

            {perms.map((p) => (
              <div key={p.roleId} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-surface-4 transition">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getRoleColor(p.roleId) }} />
                  <span className="text-[14px] text-gray-200 truncate">{getRoleName(p.roleId)}</span>
                </div>

                {/* canRead toggle */}
                <div className="w-16 flex justify-center">
                  <button
                    onClick={() => togglePerm(p.roleId, "canRead")}
                    className={`w-9 h-5 rounded-full transition-colors relative ${p.canRead ? "bg-emerald-500" : "bg-surface-6"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${p.canRead ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>

                {/* canWrite toggle */}
                <div className="w-16 flex justify-center">
                  <button
                    onClick={() => togglePerm(p.roleId, "canWrite")}
                    className={`w-9 h-5 rounded-full transition-colors relative ${p.canWrite ? "bg-emerald-500" : "bg-surface-6"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${p.canWrite ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>

                {/* canManage toggle */}
                <div className="w-16 flex justify-center">
                  <button
                    onClick={() => togglePerm(p.roleId, "canManage")}
                    className={`w-9 h-5 rounded-full transition-colors relative ${p.canManage ? "bg-amber-500" : "bg-surface-6"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${p.canManage ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border/30">
          <button onClick={onClose} className="px-4 py-2 text-[14px] text-gray-400 hover:text-white transition">
            Vazgec
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-[14px] rounded-lg font-medium disabled:opacity-40 transition"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
