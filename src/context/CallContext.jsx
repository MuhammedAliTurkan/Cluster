// src/context/CallContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useMedia } from "./MediaContext";
import { subscribeTopic, publishApp } from "../services/ws";

const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

function normalizeInvite(msg) {
  if (!msg || typeof msg !== "object") return null;
  const type = String(msg.type || msg.event || "").toUpperCase();
  const callId = msg.callId || msg.id || msg.call_id || null;
  const channelId = msg.channelId || msg.roomId || msg.room || msg.room_id || null;
  const roomId = msg.roomId || msg.room || msg.room_id || channelId || null;
  const mode = msg.mode || msg.raw?.mode || null;
  const from = msg.from || msg.caller || msg.sender || (msg.fromUserId || msg.fromDisplayName
    ? { id: msg.fromUserId, username: msg.fromUserId, displayName: msg.fromDisplayName }
    : null);
  return { raw: msg, type, callId, roomId, channelId, mode, from };
}

/** DM aramaları her zaman /app/voice/ route'una yönlendirilir (PersistentVoice kullanır) */
function voiceRoute(channelId) {
  return `/app/voice/${encodeURIComponent(channelId)}`;
}

export function CallProvider({ children }) {
  const [incoming, setIncoming] = useState(null); // normalized invite
  const [outgoing, setOutgoing] = useState(null); // {channelId, mode, callId?}
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const media = useMedia();

  const callsTopicsEnv = import.meta?.env?.VITE_WS_CALLS_TOPICS || import.meta?.env?.VITE_WS_CALLS_TOPIC || "/user/queue/calls";
  const callsTopics = String(callsTopicsEnv)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultStart = "/app/call.invite"; // backend @MessageMapping("/call.invite")
  const startDestTemplate = import.meta?.env?.VITE_WS_CALLS_START_DEST || defaultStart;
  const respondDest = import.meta?.env?.VITE_WS_CALLS_RESP_DEST || "/app/call.response";

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
      if (ch) {
        setIncoming(null);
        setOutgoing(null);
        // DM aramaları daima voice route'una (PersistentVoice)
        navigate(voiceRoute(ch), { replace: true });
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
      if (ch) {
        // DM aramaları daima voice route'una (PersistentVoice)
        navigate(voiceRoute(ch), { replace: true });
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
    ({ channelId, mode = "VOICE" } = {}) => {
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
      publishApp(respondDest, { channelId, type: "CALL_CANCEL" });
    } catch {}
    setOutgoing(null);
  }, [outgoing, respondDest]);

  const value = useMemo(
    () => ({ incoming, outgoing, accept, decline, startCall, cancelOutgoing, processSignal }),
    [incoming, outgoing, accept, decline, startCall, cancelOutgoing, processSignal]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
