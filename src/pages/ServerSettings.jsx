import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import { serverApi } from "../services/serverApi";
import { paths } from "../routes/paths";

const TABS = [
  { id: "overview", label: "Genel Bakis" },
  { id: "roles", label: "Roller" },
  { id: "members", label: "Uyeler" },
  { id: "invites", label: "Davetler" },
  { id: "moderation", label: "Moderasyon" },
  { id: "audit", label: "Denetim Kaydi" },
];

export default function ServerSettings() {
  const { activeServerId } = useChat();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeServerId) return;
    let alive = true;
    setLoading(true);
    serverApi.get(activeServerId)
      .then((data) => alive && setServer(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [activeServerId]);

  const goBack = () => nav(paths.chat);

  if (!activeServerId) {
    return <div className="h-full grid place-items-center text-gray-400">Sunucu secilmedi.</div>;
  }

  return (
    <div className="h-full flex bg-[#1a1a1a]">
      {/* Sol menu */}
      <div className="w-56 shrink-0 bg-[#2b2d31] border-r border-[#232428] flex flex-col">
        <div className="px-4 py-3 border-b border-[#232428]">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Sunucu Ayarlari</div>
          <div className="text-white font-semibold truncate">{server?.name || "..."}</div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-0.5 transition ${
                tab === t.id
                  ? "bg-[#3a3d43] text-white"
                  : "text-gray-300 hover:bg-[#35373c] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-[#232428]">
          <button
            onClick={goBack}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[#35373c] hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Geri Don
          </button>
        </div>
      </div>

      {/* Sag icerik */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-gray-400">Yukleniyor...</div>
        ) : (
          <div className="max-w-2xl mx-auto p-8">
            {tab === "overview" && <OverviewTab server={server} onUpdate={setServer} />}
            {tab === "roles" && <RolesTab serverId={activeServerId} />}
            {tab === "members" && <MembersTab serverId={activeServerId} />}
            {tab === "invites" && <InvitesTab serverId={activeServerId} />}
            {tab === "moderation" && <PlaceholderTab title="Moderasyon" />}
            {tab === "audit" && <PlaceholderTab title="Denetim Kaydi" />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Genel Bakis ── */
function OverviewTab({ server, onUpdate }) {
  const [name, setName] = useState(server?.name || "");
  const [desc, setDesc] = useState(server?.description || "");
  const [isPublic, setIsPublic] = useState(server?.isPublic || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(server?.name || "");
    setDesc(server?.description || "");
    setIsPublic(server?.isPublic || false);
  }, [server]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const data = await serverApi.update(server.id, { name: name.trim(), description: desc.trim() || null, isPublic });
      onUpdate(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Genel Bakis</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Sunucu Adi</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-md bg-[#1e1f22] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Aciklama</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="Sunucu hakkinda kisa bilgi..."
            className="w-full p-3 rounded-md bg-[#1e1f22] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-[#1e1f22] border border-[#3a3d43]">
          <div>
            <div className="text-sm text-white font-medium">Herkese Acik Sunucu</div>
            <div className="text-xs text-gray-400 mt-0.5">Kesfet'te gorunur, herkes katilabilir</div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic((p) => !p)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-orange-500" : "bg-[#3a3d43]"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="px-5 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60 transition"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          {saved && <span className="text-sm text-green-400">Kaydedildi</span>}
        </div>
      </div>

      {/* Tehlikeli alan */}
      <div className="mt-10 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
        <h3 className="text-sm font-semibold text-red-400 mb-2">Tehlikeli Bolge</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-300">Sunucuyu Sil</div>
            <div className="text-xs text-gray-500">Bu islem geri alinamaz.</div>
          </div>
          <button className="px-4 py-2 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm border border-red-500/40 transition">
            Sunucuyu Sil
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Roller ── */
function RolesTab({ serverId }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    serverApi.members(serverId)
      .then((data) => {
        if (!alive) return;
        const roleMap = new Map();
        for (const m of data || []) {
          const r = m.role;
          if (r && !roleMap.has(r.id)) roleMap.set(r.id, { ...r, count: 0 });
          if (r) roleMap.get(r.id).count++;
        }
        setRoles(Array.from(roleMap.values()));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [serverId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Roller</h2>
        <button className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm transition">
          Rol Olustur
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yukleniyor...</div>
      ) : roles.length === 0 ? (
        <div className="text-gray-400 text-sm">Henuz rol yok.</div>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1e1f22] border border-[#3a3d43]">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-white text-sm">{r.name}</span>
              </div>
              <span className="text-xs text-gray-400">{r.count} uye</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Uyeler ── */
function MembersTab({ serverId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    serverApi.members(serverId)
      .then((data) => alive && setMembers(data || []))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [serverId]);

  const filtered = q.trim()
    ? members.filter((m) => {
        const name = (m.user?.displayName || m.user?.username || "").toLowerCase();
        return name.includes(q.toLowerCase());
      })
    : members;

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Uyeler ({members.length})</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Uye ara..."
        className="w-full p-3 rounded-md bg-[#1e1f22] text-white border border-[#3a3d43] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none mb-4"
      />
      {loading ? (
        <div className="text-gray-400 text-sm">Yukleniyor...</div>
      ) : (
        <div className="space-y-1">
          {filtered.map((m) => {
            const name = m.user?.displayName || m.user?.username || "?";
            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1e1f22] transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3a3d43] grid place-items-center text-sm text-gray-300">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-white">{name}</div>
                    <div className="text-[11px] text-gray-400">{m.role?.name || "Uye"}</div>
                  </div>
                </div>
                <button className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded hover:bg-[#35373c] transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Davetler ── */
function InvitesTab({ serverId }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await serverApi.listInvites(serverId);
      setInvites(data || []);
    } catch {}
    setLoading(false);
  }, [serverId]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const createInvite = async () => {
    setCreating(true);
    try {
      await serverApi.createInvite(serverId);
      fetchInvites();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (id) => {
    try {
      await serverApi.deleteInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Davetler</h2>
        <button
          onClick={createInvite}
          disabled={creating}
          className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm transition disabled:opacity-60"
        >
          {creating ? "..." : "Davet Olustur"}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Yukleniyor...</div>
      ) : invites.length === 0 ? (
        <div className="text-gray-400 text-sm">Aktif davet kodu yok.</div>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1e1f22] border border-[#3a3d43]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-orange-400 text-sm font-mono">{inv.code}</code>
                  <button
                    onClick={() => copyCode(inv.code)}
                    className="text-gray-400 hover:text-white transition"
                    title="Kopyala"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {inv.uses ?? 0} kullanim
                  {inv.maxUses > 0 && ` / ${inv.maxUses}`}
                  {inv.creatorName && ` — ${inv.creatorName}`}
                </div>
              </div>
              <button
                onClick={() => deleteInvite(inv.id)}
                className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-[#35373c] transition"
                title="Sil"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Placeholder ── */
function PlaceholderTab({ title }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="p-8 rounded-lg bg-[#1e1f22] border border-[#3a3d43] text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-12 h-12 mx-auto text-gray-500 mb-3">
          <path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />
        </svg>
        <div className="text-gray-400 text-sm">Bu ozellik yakinda eklenecek.</div>
      </div>
    </div>
  );
}
