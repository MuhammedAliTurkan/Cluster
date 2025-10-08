import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-2xl bg-zinc-900 p-4">
        <p className="text-sm text-zinc-400">Signed in as</p>
        <p className="text-lg">{user?.email}</p>
      </div>
      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700"
      >
        Çıkış yap
      </button>
    </div>
  );
}
