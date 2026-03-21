// DEMO: Mock WebSocket — backend olmadan calisir
// Gercek STOMP baglantisi yok, sadece subscribe/publish API'si calisiyor

if (typeof window !== "undefined" && typeof global === "undefined") {
  window.global = window;
}

const listeners = {}; // { topic: [callback, ...] }
const reconnectListeners = new Set();

// Fake connected client
const mockClient = { connected: true };

export function getWsClient() {
  return mockClient;
}

export function subscribeTopic(topic, onMessage) {
  if (!listeners[topic]) listeners[topic] = [];
  listeners[topic].push(onMessage);
  return () => {
    listeners[topic] = (listeners[topic] || []).filter((fn) => fn !== onMessage);
  };
}

export function publishApp(dest, payload) {
  console.log("[MockWS] publish:", dest, payload);

  // Mesaj gonderimini simule et — ayni kanala mesaj olarak geri don
  if (dest.includes("/send")) {
    const match = dest.match(/\/channels\/([^/]+)\/send/);
    if (match) {
      const channelId = match[1];
      import("../mock/mockData.js").then(({ addMockMessage }) => {
        const msg = addMockMessage(channelId, payload.content);
        setTimeout(() => {
          const topic = `/topic/channels/${channelId}`;
          (listeners[topic] || []).forEach((fn) => {
            try { fn(msg); } catch {}
          });
        }, 100);
      });
    }
  }
}

export function onReconnect(fn) {
  reconnectListeners.add(fn);
  // Hemen cagir — "baglanti kuruldu" simule et
  setTimeout(() => fn(), 200);
  return () => reconnectListeners.delete(fn);
}

// Mock: topic'e disaridan mesaj gondermek icin (test amacli)
export function mockInject(topic, data) {
  (listeners[topic] || []).forEach((fn) => {
    try { fn(data); } catch {}
  });
}
