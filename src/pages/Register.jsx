import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Register() {
  const [form, setForm] = useState({ userName: "", email: "", password: "" });
  const { register } = useAuth();
  const nav = useNavigate();

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form.userName, form.email, form.password);
      nav("/app"); // kayıt sonrası ana sayfaya yönlendir (register zaten login yapıyor)
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Kayıt başarısız");
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-surface-2">
      <div className="bg-surface-3 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Kaydol</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="userName"
            value={form.userName}
            onChange={handleChange}
            placeholder="Kullanıcı adı"
            className="w-full p-3 rounded-md bg-surface-5 text-white border border-border-hover"
            minLength={3}
            maxLength={30}
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-posta"
            className="w-full p-3 rounded-md bg-surface-5 text-white border border-border-hover"
            required
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Şifre"
            className="w-full p-3 rounded-md bg-surface-5 text-white border border-border-hover"
            minLength={6}
            required
          />
          <button className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-3 rounded-md">
            Kaydol
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Zaten hesabın var mı?{" "}
          <Link to="/login" className="text-accent-light hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
