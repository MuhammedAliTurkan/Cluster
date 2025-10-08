// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { sessionBus } from "../utils/sessionBus";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: false,
});

// cfg.url mutlak da olabilir relatif de; path'i güvenle çıkar
function getPath(url) {
  try {
    const base = api?.defaults?.baseURL || window.location.origin;
    return new URL(url, base).pathname;
  } catch {
    return String(url || "");
  }
}

// Sadece login/register anonim; /api/auth/me anonim DEĞİL
function isAnonymousRequest(cfg) {
  const p = getPath(cfg?.url);
  return p === "/api/auth/login" || p === "/api/auth/register" || p.startsWith("/actuator/health");
}

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const raw = localStorage.getItem("token");
    return raw && raw !== "null" && raw !== "undefined" ? raw : null;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Request interceptor
  useEffect(() => {
    const reqId = api.interceptors.request.use((cfg) => {
      const raw = localStorage.getItem("token");
      const t = raw && raw !== "null" && raw !== "undefined" ? raw : null;

      if (t && !isAnonymousRequest(cfg)) {
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${t}`;
      } else if (cfg?.headers && "Authorization" in cfg.headers) {
        delete cfg.headers.Authorization;
      }

      if (!cfg.headers["Content-Type"] && cfg.data && typeof cfg.data === "object") {
        cfg.headers["Content-Type"] = "application/json";
      }
      return cfg;
    });
    return () => api.interceptors.request.eject(reqId);
  }, []);

  // Response interceptor (401 → global logout)
  useEffect(() => {
    const resId = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) sessionBus.emitUnauthorized();
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(resId);
  }, []);

  // 401 sinyalini dinle
  useEffect(() => {
    const off = sessionBus.onUnauthorized(() => logout());
    return off;
  }, []); // logout stable

  const fetchMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      // EKSTRA EMNİYET: header'ı burada da elle ekliyoruz
      const t = localStorage.getItem("token");
      const { data } = await api.get("/api/auth/me", {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      setUser(data);
    } catch {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/api/auth/login", { email, password });
      const t = data?.token;
      if (t) {
        localStorage.setItem("token", t);
        setToken(t);
      }
      if (data?.user) {
        setUser(data.user);
        setLoading(false);
      } else {
        await fetchMe();
      }
    },
    [fetchMe]
  );

  const register = useCallback(
    async (userName,email, password) => {
      await api.post("/api/auth/register", { userName,email, password });
      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, api }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
