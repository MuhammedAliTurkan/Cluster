// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";
import { ModalProvider } from "./context/ModalContext";
import { MediaProvider } from "./context/MediaContext";
import { PresenceProvider } from "./context/PresenceContext";
import { UnreadProvider } from "./context/UnreadContext";

import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainApp from "./pages/MainApp";

function RootGate() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-surface-2 text-white grid place-items-center">
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
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e1f22",
            color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />
      <AuthProvider>
        <ChatProvider>
          <ModalProvider>
            <MediaProvider>
            <PresenceProvider>
            <UnreadProvider>
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
            </UnreadProvider>
            </PresenceProvider>
            </MediaProvider>
          </ModalProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
