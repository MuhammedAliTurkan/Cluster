import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  return (
    <div className="relative">
      {/* ... mevcut menü tetikleyici ... */}
      <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-800 shadow-lg p-1">
        <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-700">
          {user?.email || "Profile"}
        </button>
        <hr className="border-zinc-700 my-1" />
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-700"
        >
          Çıkış yap
        </button>
      </div>
    </div>
  );
}
