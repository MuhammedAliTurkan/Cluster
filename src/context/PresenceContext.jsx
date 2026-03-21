import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { subscribeTopic, publishApp, onReconnect } from "../services/ws";
import { fetchBulkPresence } from "../services/presenceApi";

const PresenceContext = createContext(null);
export const usePresence = () => useContext(PresenceContext);

const STATUS_OPTIONS = [
  { value: "online",    label: "Çevrimiçi",        color: "bg-green-500" },
  { value: "idle",      label: "Boşta",             color: "bg-yellow-500" },
  { value: "dnd",       label: "Rahatsız Etmeyin",  color: "bg-red-500" },
  { value: "invisible", label: "Görünmez",          color: "bg-gray-500" },
];

export { STATUS_OPTIONS };

export function PresenceProvider({ children }) {
  const { user, token } = useAuth();
  // { userId: "online"|"offline"|"idle"|"dnd" }
  const [statuses, setStatuses] = useState({});
  const [myStatus, setMyStatusRaw] = useState(() => {
    return localStorage.getItem("cl-presence-status") || "online";
  });

  const setMyStatus = useCallback((s) => {
    setMyStatusRaw(s);
    if (s) localStorage.setItem("cl-presence-status", s);
  }, []);

  // STOMP'tan gelen presence güncellemelerini dinle
  useEffect(() => {
    if (!token) return;
    const unsub = subscribeTopic("/user/queue/presence", (msg) => {
      console.log("[Presence] STOMP received:", msg);
      if (msg?.userId && msg?.status) {
        setStatuses((prev) => ({ ...prev, [msg.userId]: msg.status }));
        if (user && msg.userId === user.id) {
          setMyStatus(msg.status);
        }
      }
    });
    return unsub;
  }, [token, user]);

  // İlk yüklemede kaydedilmiş durumu backend'e bildir
  // Not: fetchMyPresence kaldırıldı — STOMP bağlanmadan önce çalışırsa
  // backend "offline" döner ve yanlış durum gösterilir.
  // Durum, onReconnect handler'ı ile STOMP bağlandığında publish edilir.
  useEffect(() => {
    if (!token) return;
    const saved = localStorage.getItem("cl-presence-status") || "online";
    // STOMP bağlantısı kurulduğunda gönderilir (publishApp kuyruğa alır)
    publishApp("/app/presence.status", { status: saved });
  }, [token]);

  // Arkadaş listesi değiştiğinde durumları toplu çek
  const fetchPresences = useCallback(async (userIds) => {
    if (!userIds || userIds.length === 0) return;
    try {
      const data = await fetchBulkPresence(userIds);
      setStatuses((prev) => ({ ...prev, ...data }));
    } catch (e) {
      console.error("[Presence] bulk fetch error:", e);
    }
  }, []);

  // Periyodik presence yenileme — 10 saniyede bir (STOMP kaçırırsa yedek)
  const trackedIdsRef = useRef([]);
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const ids = trackedIdsRef.current;
      if (ids.length > 0) {
        fetchBulkPresence(ids)
          .then((data) => setStatuses((prev) => ({ ...prev, ...data })))
          .catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // fetchPresences çağrıldığında takip edilen id'leri kaydet
  const fetchPresencesTracked = useCallback(async (userIds) => {
    trackedIdsRef.current = userIds || [];
    return fetchPresences(userIds);
  }, [fetchPresences]);

  // STOMP yeniden bağlandığında presence'ı hemen güncelle
  useEffect(() => {
    if (!token) return;
    return onReconnect(() => {
      // Kendi durumumu backend'e bildir
      const saved = localStorage.getItem("cl-presence-status");
      if (saved) publishApp("/app/presence.status", { status: saved });
      // Takip edilen kullanıcıların durumlarını yenile
      const ids = trackedIdsRef.current;
      if (ids.length > 0) {
        fetchBulkPresence(ids)
          .then((data) => setStatuses((prev) => ({ ...prev, ...data })))
          .catch(() => {});
      }
    });
  }, [token]);

  // Durum değiştir (STOMP üzerinden)
  const changeStatus = useCallback((status) => {
    publishApp("/app/presence.status", { status });
    setMyStatus(status);
  }, []);

  // Bir kullanıcının görüntülenen durumunu getir (avatar badge, sınıflandırma vb.)
  // invisible → başkaları "offline" görür, kendisi de listede "offline" grubunda olmalı
  const getStatus = useCallback(
    (userId) => {
      if (user && userId === user.id) {
        return myStatus === "invisible" ? "offline" : myStatus;
      }
      return statuses[userId] || "offline";
    },
    [statuses, myStatus, user]
  );

  const value = useMemo(
    () => ({ statuses, myStatus, changeStatus, getStatus, fetchPresences: fetchPresencesTracked }),
    [statuses, myStatus, changeStatus, getStatus, fetchPresencesTracked]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
