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
    if (before) qs.set("before", before);
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
  async sendMessageWithAttachments(channelId, { content = "", type = "TEXT", parentMessageId = null, files = [] }) {
    const formData = new FormData();
    formData.append("content", content);
    formData.append("type", type);
    if (parentMessageId) formData.append("parentMessageId", parentMessageId);
    files.forEach((f) => formData.append("files", f));
    const res = await api.post(`/api/channels/${channelId}/messages/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  async searchMessages(channelId, query) {
    const res = await api.get(`/api/channels/${channelId}/messages/search`, { params: { q: query } });
    return res.data; // MessageResponse[]
  },
  async leaveDm(channelId) {
    await api.delete(`/api/channels/${channelId}/leave`);
  },

  // Group DM member API
  async listDmMembers(channelId) {
    const res = await api.get(`/api/channels/${channelId}/members`);
    return res.data;
  },
  async addDmMember(channelId, userId) {
    const res = await api.post(`/api/channels/${channelId}/members`, { userId });
    return res.data;
  },
  async removeDmMember(channelId, userId) {
    const res = await api.delete(`/api/channels/${channelId}/members/${userId}`);
    return res.data;
  },
  async patchChannel(channelId, { title, iconUrl }) {
    const res = await api.patch(`/api/channels/${channelId}`, { title, iconUrl });
    return res.data;
  },

  // Pin API
  async togglePin(channelId, messageId) {
    const res = await api.post(`/api/channels/${channelId}/messages/${messageId}/pin`);
    return res.data;
  },
  async listPinned(channelId) {
    const res = await api.get(`/api/channels/${channelId}/messages/pinned`);
    return res.data;
  },

  // Thread API
  async createThread(channelId, messageId, title = null) {
    const res = await api.post(`/api/channels/${channelId}/messages/${messageId}/threads`, title ? { title } : {});
    return res.data;
  },
  async listThreads(channelId) {
    const res = await api.get(`/api/channels/${channelId}/threads`);
    return res.data;
  },
  async getThread(threadId) {
    const res = await api.get(`/api/threads/${threadId}`);
    return res.data;
  },
};

export default dmApi;
