// src/services/dmApi.js
import { api } from "../context/AuthContext";

// Backend endpointleri
const ENDPOINTS = {
  ensure: "/api/channels/dm/ensure",                         // POST
  listMine: (type = "DM") => `/api/channels?type=${type}`,   // GET
  getChannel: (id) => `/api/channels/${id}`,                 // GET
  listMessages: (channelId, { limit, before } = {}) => {
    const qs = new URLSearchParams();
    if (limit) qs.set("limit", String(limit));
    if (before) qs.set("beforeMessageId", before);
    const suffix = qs.toString() ? `?${qs}` : "";
    return `/api/channels/${channelId}/messages${suffix}`;   // GET
  },
  sendMessage: (channelId) => `/api/channels/${channelId}/messages` // POST
};

const dmApi = {
  async ensureWithParticipants(participantIds, { title, iconUrl, reuseForGroup } = {}) {
    const res = await api.post(ENDPOINTS.ensure, { participantIds, title, iconUrl, reuseForGroup });
    return res.data; // ChannelResponse
  },
  async listDMs() {
    const res = await api.get(ENDPOINTS.listMine("DM"));
    return res.data; // ChannelResponse[]
  },
  async getChannel(channelId) {
    const res = await api.get(ENDPOINTS.getChannel(channelId));
    return res.data; // ChannelResponse
  },
  async listMessages(channelId, { limit = 50, before } = {}) {
    const url = ENDPOINTS.listMessages(channelId, { limit, before });
    const res = await api.get(url);
    return res.data; // MessageResponse[]
  },
  async sendMessage(channelId, { content, type = "TEXT", parentMessageId } = {}) {
    const res = await api.post(ENDPOINTS.sendMessage(channelId), { content, type, parentMessageId });
    return res.data; // MessageResponse
  },
};

export default dmApi;
