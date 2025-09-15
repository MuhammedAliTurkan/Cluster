import { useState } from "react";
import { Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const onChange = (e)=>setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e)=>{ e.preventDefault(); console.log("Register", form); };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#1C1C1C]">
      <div className="bg-[#2B2B2B] p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Hesap oluştur</h1>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Ad</label>
            <input name="name" value={form.name} onChange={onChange}
              className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">E-posta</label>
            <input type="email" name="email" value={form.email} onChange={onChange}
              className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Şifre</label>
            <input type="password" name="password" value={form.password} onChange={onChange}
              className="w-full p-3 rounded-md bg-[#3A3A3A] text-white border border-[#4A4A4A] focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-md">Kaydol</button>
        </form>
        <p className="text-gray-400 text-sm text-center mt-6">
          Zaten hesabın var mı? <Link to="/login" className="text-orange-400 hover:underline">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
