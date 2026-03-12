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
  return res.data;
}

/** Ses kanalındaki aktif katılımcıları getir */
export async function fetchVoiceParticipants(channelId) {
  const res = await api.get(`/api/livekit/participants/${channelId}`);
  return res.data; // [{identity, name, avatarUrl}]
}
