import { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login form:", form);
    // TODO: backend API çağrısı yapılacak
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#1C1C1C]">
      <div className="bg-[#2B2B2B] p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Hoş geldin!
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Hesabına giriş yap ya da yeni hesap oluştur.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-gray-300 text-sm mb-1">E-posta</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="ornek@mail.com"
              required
            />
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-gray-300 text-sm mb-1">Şifre</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="********"
              required
            />
          </div>

          {/* Giriş Yap Butonu */}
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-md transition"
          >
            Giriş Yap
          </button>
        </form>

        {/* Register link */}
        <p className="text-gray-400 text-sm text-center mt-6">
          Hesabın yok mu?{" "}
          <Link to="/register" className="text-orange-400 hover:underline">
            Kaydol
          </Link>
        </p>
      </div>
    </div>
  );
}
