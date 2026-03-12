// src/services/ws.js
if (typeof window !== "undefined" && typeof global === "undefined") {
  window.global = window;
}

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs.js";

// Backend WebSocket endpoint — tam URL olmalı
const WS_HTTP_URL = import.meta.env.VITE_WS_HTTP_URL || "/ws";

let client;

export function getWsClient() {
  if (client) return client;

  const enableDebug = String(import.meta?.env?.VITE_WS_DEBUG || "").trim() !== "";

  client = new Client({
    webSocketFactory: () => new SockJS(WS_HTTP_URL),
    reconnectDelay: 2000,
    debug: enableDebug ? (m) => console.log("[STOMP]", m) : () => {},

    // STOMP CONNECT anında JWT token gönder
    connectHeaders: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },

    // Her yeniden bağlantıda güncel token'ı al
    beforeConnect: () => {
      const token = localStorage.getItem("token");
      if (client && token) {
        client.connectHeaders = {
          Authorization: `Bearer ${token}`,
        };
      }
    },
  });

  client.onConnect = (f) => {
    if (enableDebug) console.log("[STOMP] connected", f?.headers);
  };
  client.onStompError = (f) => {
    console.error("[STOMP] broker error", f?.headers, f?.body);
  };

  client.activate();
  return client;
}

export function subscribeTopic(topic, onMessage) {
  const c = getWsClient();

  const doSub = () =>
    c.subscribe(topic, (frame) => {
      try {
        onMessage?.(frame.body ? JSON.parse(frame.body) : null, frame);
      } catch {
        onMessage?.(frame.body, frame);
      }
    });

  if (!c.connected) {
    const prev = c.onConnect;
    c.onConnect = (f) => {
      prev?.(f);
      doSub();
    };
    return () => {
      if (c.onConnect === doSub) c.onConnect = prev || null;
    };
  }

  const sub = doSub();
  return () => {
    try { sub?.unsubscribe?.(); } catch {}
  };
}

export function publishApp(dest, payload) {
  const c = getWsClient();
  const send = () => c.publish({ destination: dest, body: JSON.stringify(payload ?? {}) });

  if (!c.connected) {
    const prev = c.onConnect;
    c.onConnect = (f) => { prev?.(f); send(); };
  } else {
    send();
  }
}
