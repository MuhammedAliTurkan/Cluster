// src/context/CallContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { subscribeTopic, publishApp } from "../services/ws";

const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

function normalizeInvite(msg) {
  if (!msg || typeof msg !== "object") return null;
  const type = String(msg.type || msg.event || "").toUpperCase();
  const callId = msg.callId || msg.id || msg.call_id || null;
  const channelId = msg.channelId || msg.roomId || msg.room || msg.room_id || null;
  const roomId = msg.roomId || msg.room || msg.room_id || channelId || null;
  const from = msg.from || msg.caller || msg.sender || (msg.fromUserId || msg.fromDisplayName
    ? { id: msg.fromUserId, username: msg.fromUserId, displayName: msg.fromDisplayName }
    : null);
  return { raw: msg, type, callId, roomId, channelId, from };
}

export function CallProvider({ children }) {
  const [incoming, setIncoming] = useState(null); // normalized invite
  const [outgoing, setOutgoing] = useState(null); // {channelId, mode, callId?}
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const callsTopicsEnv = import.meta?.env?.VITE_WS_CALLS_TOPICS || import.meta?.env?.VITE_WS_CALLS_TOPIC || "/user/queue/calls";
  const callsTopics = String(callsTopicsEnv)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const appPrefix = import.meta?.env?.VITE_WS_CALLS_APP_PREFIX || "/app/calls"; // legacy
  const defaultStart = "/app/call.invite"; // backend @MessageMapping("/call.invite")
  const startDestTemplate = import.meta?.env?.VITE_WS_CALLS_START_DEST || defaultStart; // örn: /app/channels/:channelId/call/start
  const respondDest = import.meta?.env?.VITE_WS_CALLS_RESP_DEST || "/app/call.response"; // backend @MessageMapping("/call.response")

  const fmtDest = useCallback((tpl, vars) => {
    let d = String(tpl || "");
    Object.entries(vars || {}).forEach(([k, v]) => {
      d = d.replaceAll(`:${k}`, String(v ?? ""));
    });
    return d;
  }, []);

  const processSignal = useCallback((body) => {
    const inv = normalizeInvite(body);
    if (!inv) return;

    if (inv.type === "CALL_INVITE") {
      const isFromMe = !!user && (
        inv?.from?.id === user?.id || inv?.from?.username === user?.username
      );
      if (isFromMe) {
        setOutgoing((cur) => ({ ...(cur || {}), callId: inv.callId }));
      } else {
        setIncoming(inv);
      }
    } else if (inv.type === "CALL_CANCEL") {
      setIncoming((cur) => (cur && (cur.callId === inv.callId || cur.channelId === inv.channelId) ? null : cur));
      setOutgoing((cur) => (cur && (cur.callId === inv.callId || cur.channelId === inv.channelId) ? null : cur));
    } else if (inv.type === "CALL_ACCEPT") {
      const ch = inv.channelId || inv.roomId;
      const mode = inv.raw?.mode || outgoing?.mode || "VIDEO";
      if (ch) {
        setIncoming(null);
        setOutgoing(null);
        const route = mode === "VOICE" || mode === "audio"
          ? `/app/voice/${encodeURIComponent(ch)}`
          : `/app/video/${encodeURIComponent(ch)}?channelId=${encodeURIComponent(ch)}&mode=${mode === "VIDEO" ? "video" : mode}`;
        navigate(route, { replace: true });
      }
    } else if (inv.type === "CALL_DECLINE") {
      setOutgoing(null);
    }
  }, [user, navigate]);

  useEffect(() => {
    const unsubs = callsTopics.map((t) => subscribeTopic(t, (body) => processSignal(body)));
    return () => unsubs.forEach((u) => u?.());
  }, [callsTopicsEnv, processSignal]);

  const accept = useCallback(
    (invite) => {
      const inv = normalizeInvite(invite || incoming);
      if (!inv || !inv.channelId) return;
      try {
        publishApp(respondDest, { channelId: inv.channelId, type: "CALL_ACCEPT" });
      } catch {}
      setIncoming(null);
      const ch = inv.channelId || inv.roomId;
      const mode = inv.raw?.mode || "video";
      if (ch) {
        const route = mode === "VOICE" || mode === "audio"
          ? `/app/voice/${encodeURIComponent(ch)}`
          : `/app/video/${encodeURIComponent(ch)}?channelId=${encodeURIComponent(ch)}&mode=${mode === "VIDEO" ? "video" : mode}`;
        navigate(route, { replace: true });
      }
    },
    [incoming, respondDest, navigate]
  );

  const decline = useCallback(
    (invite) => {
      const inv = normalizeInvite(invite || incoming);
      if (!inv || !inv.channelId) {
        setIncoming(null);
        return;
      }
      try {
        publishApp(respondDest, { channelId: inv.channelId, type: "CALL_DECLINE" });
      } catch {}
      setIncoming(null);
    },
    [incoming, respondDest]
  );

  const startCall = useCallback(
    ({ channelId, mode = "VIDEO" } = {}) => {
      if (!channelId) return;
      try {
        const dest = fmtDest(startDestTemplate, { channelId, mode });
        publishApp(dest, { channelId, mode });
      } catch {}
      setOutgoing({ channelId, mode, callId: null });
    },
    [fmtDest, startDestTemplate]
  );

  const cancelOutgoing = useCallback(() => {
    const channelId = outgoing?.channelId;
    if (!channelId) { setOutgoing(null); return; }
    try {
      publishApp(respondDest, { channelId, type: "CALL_DECLINE" });
    } catch {}
    setOutgoing(null);
  }, [outgoing, respondDest]);

  const value = useMemo(
    () => ({ incoming, outgoing, accept, decline, startCall, cancelOutgoing, processSignal }),
    [incoming, outgoing, accept, decline, startCall, cancelOutgoing, processSignal]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
