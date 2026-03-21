// src/services/livekitApi.js
import { api } from "../context/AuthContext";

/**
 * Backend'den LiveKit token al.
 * @param {string} channelId - Kanal ID
 * @param {string} mode - "audio" | "video"
 * @returns {Promise<{token: string, wsUrl: string, room: string}>}
 */
export async function fetchLiveKitToken(channelId, mode = "video") {
  const res = await api.post("/api/livekit/token", { channelId, mode });
  const data = res.data;
  // LiveKit WS baglantisini Vite proxy uzerinden yonlendir (self-signed cert sorununu onler)
  data.wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
  return data;
}

/** Ses kanalındaki aktif katılımcıları getir */
export async function fetchVoiceParticipants(channelId) {
  const res = await api.get(`/api/livekit/participants/${channelId}`);
  return res.data; // [{identity, name, avatarUrl}]
}

/** Ses kanalına bağlandığını bildir (LiveKit bağlantısı kurulduktan sonra) */
export async function notifyVoiceJoin(channelId) {
  try {
    await api.post("/api/livekit/join", { channelId });
  } catch (e) {
    console.warn("Voice join notify failed:", e);
  }
}

/** Ses kanalından ayrıldığını bildir */
export async function notifyVoiceLeave(channelId) {
  try {
    await api.post("/api/livekit/leave", { channelId });
  } catch (e) {
    console.warn("Voice leave notify failed:", e);
  }
}
