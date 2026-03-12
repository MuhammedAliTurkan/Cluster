import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      alert(err?.response?.data?.message || err.message || "Kayıt başarısız");
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#1C1C1C]">
      <div className="bg-[#2B2B2B] p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Kaydol</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="userName"
            value={form.userName}
            onChange={handleChange}
            placeholder="Kullanıcı adı"
            className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A]"
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
            className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A]"
            required
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Şifre"
            className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A]"
            minLength={6}
            required
          />
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-md">
            Kaydol
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Zaten hesabın var mı?{" "}
          <Link to="/login" className="text-orange-400 hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
