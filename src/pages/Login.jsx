import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, token } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  if (token) {
    nav(from, { replace: true });
  }

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password, remember);
      nav(from, { replace: true });
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Giriş başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-2">
      <div className="bg-surface-3 p-8 rounded-2xl shadow-lg w-full max-w-md border border-border-light">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Giriş Yap</h1>

        {err && (
          <div className="mb-4 rounded-lg bg-red-500/10 text-red-300 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">E-posta</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="örnek@mail.com"
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 text-white border border-border-light outline-none focus:border-accent text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Şifre</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 text-white border border-border-light outline-none focus:border-accent text-sm"
              required
            />
          </div>

          {/* Beni Hatırla */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-border-light bg-surface-2 accent-emerald-500"
            />
            <span className="text-sm text-gray-400">Beni hatırla</span>
            <span className="text-[10px] text-gray-600 ml-auto">30 gün boyunca oturum açık kalır</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-accent hover:bg-accent-dark text-white py-2.5 font-medium transition disabled:opacity-60"
          >
            {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Hesabın yok mu?{" "}
          <Link to="/register" className="text-accent-light hover:underline">
            Kaydol
          </Link>
        </p>
      </div>
    </div>
  );
}
