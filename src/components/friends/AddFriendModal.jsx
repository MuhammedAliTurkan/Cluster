// src/components/friends/AddFriendModal.jsx
import { useState } from "react";
import { friendsApi } from "../../services/friendsApi";

export default function AddFriendModal({ open, onClose, onChanged }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("search"); // search | result | sent | error
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  if (!open) return null;

  const reset = () => {
    setUsername("");
    setLoading(false);
    setStep("search");
    setError("");
    setUser(null);
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    setError("");
    try {
      const u = await friendsApi.lookupExact(name);
      setUser(u);
      setStep("result");
    } catch (err) {
      setUser(null);
      setStep("error");
      setError("Kullanıcı bulunamadı. (Tam kullanıcı adı girin)");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError("");
    try {
      // her zaman ID ile gönder
      let targetId = user?.id;
      if (!targetId) {
        // kullanıcıyı önce bulup ID çıkar
        const u = await friendsApi.lookupExact(username.trim());
        targetId = u?.id;
      }
      if (!targetId) throw new Error("Geçersiz hedef");

      await friendsApi.sendRequest(targetId); // <-- ID gönderiyoruz
      setStep("sent");
      onChanged?.(); // listeyi tazele
    } catch (err) {
      setStep("error");
      setError(err?.response?.data?.message || "İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* arka plan */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={close}
        aria-label="Kapat"
      />
      {/* kart */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#2B2B2B] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Arkadaş ekle</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-2 py-1 text-zinc-300 hover:text-white"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Search Step */}
        {step === "search" && (
          <form onSubmit={handleSearch} className="space-y-3">
            <p className="text-sm text-zinc-400">
              Tam kullanıcı adını girin (ör. <span className="text-zinc-200">john_doe</span>)
            </p>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adı"
              className="w-full rounded-xl bg-[#1F1F1F] px-3 py-2 text-white outline-none"
            />
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full rounded-xl bg-zinc-800 py-2 text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {loading ? "Aranıyor…" : "Ara"}
            </button>
          </form>
        )}

        {/* Result Step */}
        {step === "result" && user && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {/* avatar */}
              <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-700">
                {user.displayName?.[0]?.toUpperCase() ||
                  user.username?.[0]?.toUpperCase() ||
                  "U"}
              </div>
              <div>
                <div className="font-medium text-white">
                  {user.displayName || user.username}
                </div>
                <div className="text-sm text-zinc-400">@{user.username}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="flex-1 rounded-xl bg-zinc-800 py-2 text-white hover:bg-zinc-700"
              >
                {loading ? "Gönderiliyor…" : "İstek gönder"}
              </button>
              <button
                type="button"
                onClick={() => setStep("search")}
                className="rounded-xl bg-zinc-700/40 px-4 text-white hover:bg-zinc-700/60"
              >
                Geri
              </button>
            </div>
          </div>
        )}

        {/* Sent Step */}
        {step === "sent" && (
          <div className="space-y-4">
            <p className="text-green-400">Arkadaşlık isteği gönderildi.</p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl bg-zinc-800 py-2 text-white hover:bg-zinc-700"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="space-y-4">
            <p className="text-red-400">{error || "Bir hata oluştu."}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("search")}
                className="flex-1 rounded-xl bg-zinc-800 py-2 text-white hover:bg-zinc-700"
              >
                Tekrar dene
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-xl bg-zinc-700/40 px-4 text-white hover:bg-zinc-700/60"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
