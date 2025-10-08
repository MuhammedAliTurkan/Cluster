import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, token } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  // Eğer zaten giriş yapmışsa bu sayfada durmasın
  if (token) {
    // küçük bir koruma: router içinde çağrıldığı için güvenli
    nav(from, { replace: true });
  }

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      nav(from, { replace: true }); // ✨ kritik satır
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1C1C1C]">
      <div className="bg-[#2B2B2B] p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Giriş yap</h1>

        {err && (
          <div className="mb-4 rounded-lg bg-red-500/10 text-red-300 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full px-3 py-2 rounded-lg bg-[#1F1F1F] text-white outline-none"
            required
          />
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Şifre"
            className="w-full px-3 py-2 rounded-lg bg-[#1F1F1F] text-white outline-none"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white py-2"
          >
            {submitting ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p className="text-sm text-zinc-400 mt-4 text-center">
          Hesabın yok mu?{" "}
          <Link to="/register" className="text-zinc-200 underline">
            Kaydol
          </Link>
        </p>
      </div>
    </div>
  );
}
