// src/services/ws.js
if (typeof window !== "undefined" && typeof global === "undefined") {
  window.global = window;
}

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs.js";

// Backend (Spring) WebSocket endpoint'in:
// WebSocketConfig.registerStompEndpoints → addEndpoint("/ws").withSockJS();
const WS_HTTP_URL = import.meta.env.VITE_WS_HTTP_URL || "http://localhost:8080/ws";

let client;

export function getWsClient() {
  if (client) return client;

  client = new Client({
    // SockJS kullanıyorsak brokerURL KULLANMA; onun yerine webSocketFactory ver
    webSocketFactory: () => new SockJS(WS_HTTP_URL),
    reconnectDelay: 2000,
    debug: () => {}, // istersen console.log
  });

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
    c.onConnect = () => {
      prev?.();
      doSub();
    };
    return () => {
      // bağlantıdan önce unmount olursa
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
    c.onConnect = () => { prev?.(); send(); };
  } else {
    send();
  }
}
