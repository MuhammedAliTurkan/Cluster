// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";
import { ModalProvider } from "./context/ModalContext";
import { MediaProvider } from "./context/MediaContext";

import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainApp from "./pages/MainApp";

function RootGate() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#1C1C1C] text-white grid place-items-center">
        Yükleniyor…
      </div>
    );
  }

  // Giriş yaptıysa ana uygulamaya; değilse login'e
  // İlk iniş sayfası olarak /app/friends kullanıyoruz
  return <Navigate to={token ? "/app/friends" : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <ModalProvider>
            <MediaProvider>
            <CallProvider>
            <Routes>
              {/* Kök yönlendirme */}
              <Route path="/" element={<RootGate />} />

              {/* Anonim sayfalar */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Korumalı ana uygulama (tüm /app altı burada) */}
              <Route
                path="/app/*"
                element={
                  <PrivateRoute>
                    <MainApp />
                  </PrivateRoute>
                }
              />

              {/* Bilinmeyen her şey köke döner */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </CallProvider>
            </MediaProvider>
          </ModalProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
