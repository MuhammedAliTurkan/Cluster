// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import { sessionBus } from "../utils/sessionBus";
import { setupMockInterceptor } from "../mock/mockApi";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: false,
});

// DEMO: Mock interceptor — backend olmadan calisir
setupMockInterceptor(api);

function getPath(url) {
  try {
    const base = api?.defaults?.baseURL || window.location.origin;
    return new URL(url, base).pathname;
  } catch {
    return String(url || "");
  }
}

function isAnonymousRequest(cfg) {
  const p = getPath(cfg?.url);
  return p === "/api/auth/login" || p === "/api/auth/register"
    || p === "/api/auth/refresh" || p.startsWith("/actuator/health");
}

/* ── Token storage helpers ── */
function getStorage() {
  // "Beni hatırla" seçildiyse localStorage, yoksa sessionStorage
  return localStorage.getItem("cl-remember") === "true" ? localStorage : sessionStorage;
}

function getToken() {
  // Önce localStorage, sonra sessionStorage kontrol et
  const t = localStorage.getItem("token") || sessionStorage.getItem("token");
  return t && t !== "null" && t !== "undefined" ? t : null;
}

function getRefreshToken() {
  const t = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
  return t && t !== "null" && t !== "undefined" ? t : null;
}

function storeTokens(accessToken, refreshToken, remember) {
  const storage = remember ? localStorage : sessionStorage;
  // Diğer storage'ı temizle
  const other = remember ? sessionStorage : localStorage;
  other.removeItem("token");
  other.removeItem("refreshToken");

  storage.setItem("token", accessToken);
  if (refreshToken) storage.setItem("refreshToken", refreshToken);
  if (remember) localStorage.setItem("cl-remember", "true");
  else localStorage.removeItem("cl-remember");
}

function clearTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("cl-remember");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("refreshToken");
}

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(null); // tek refresh isteği garantisi

  // Request interceptor — her isteğe access token ekle
  useEffect(() => {
    const reqId = api.interceptors.request.use((cfg) => {
      const t = getToken();
      if (t && !isAnonymousRequest(cfg)) {
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${t}`;
      }
      if (!cfg.headers["Content-Type"] && cfg.data && typeof cfg.data === "object") {
        cfg.headers["Content-Type"] = "application/json";
      }
      return cfg;
    });
    return () => api.interceptors.request.eject(reqId);
  }, []);

  // Response interceptor — 401'de refresh dene, başarısızsa logout
  useEffect(() => {
    const resId = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const orig = err.config;
        if (err?.response?.status === 401 && !orig._retry && !isAnonymousRequest(orig)) {
          orig._retry = true;
          const refreshed = await tryRefresh();
          if (refreshed) {
            // Yeni token ile tekrar dene
            orig.headers.Authorization = `Bearer ${getToken()}`;
            return api(orig);
          }
          // Refresh de başarısız → logout
          sessionBus.emitUnauthorized();
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(resId);
  }, []);

  // 401 sinyalini dinle
  useEffect(() => {
    const off = sessionBus.onUnauthorized(() => logout());
    return off;
  }, []);

  /** Refresh token ile yeni access token al */
  const tryRefresh = async () => {
    const rt = getRefreshToken();
    if (!rt) return false;

    // Aynı anda birden fazla refresh isteği gönderme
    if (refreshingRef.current) return refreshingRef.current;

    refreshingRef.current = (async () => {
      try {
        const { data } = await axios.post(
          (import.meta.env.VITE_API_URL || "") + "/api/auth/refresh",
          { refreshToken: rt }
        );
        if (data?.token) {
          const remember = localStorage.getItem("cl-remember") === "true";
          storeTokens(data.token, data.refreshToken, remember);
          setToken(data.token);
          if (data.user) setUser(data.user);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshingRef.current = null;
      }
    })();

    return refreshingRef.current;
  };

  const fetchMe = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(data);
    } catch {
      // Access token expired → refresh dene
      const refreshed = await tryRefresh();
      if (refreshed) {
        try {
          const { data } = await api.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          setUser(data);
          return;
        } catch {}
      }
      clearTokens();
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
    async (email, password, remember = true) => {
      const { data } = await api.post("/api/auth/login", { email, password });
      if (data?.token) {
        storeTokens(data.token, data.refreshToken, remember);
        setToken(data.token);
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
    async (userName, email, password) => {
      await api.post("/api/auth/register", { userName, email, password });
      return login(email, password, true);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {} // Sunucu erişilemezse de çıkış yap
    clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser, api }),
    [user, token, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
