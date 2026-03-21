import { api } from "../context/AuthContext";

const unreadApi = {
  async getSummary() {
    const res = await api.get("/api/unread/summary");
    return res.data;
  },
  async markRead(channelId, lastReadMessageId) {
    const res = await api.post(`/api/channels/${channelId}/state/read`, { lastReadMessageId });
    return res.data;
  },
  async getState(channelId) {
    const res = await api.get(`/api/channels/${channelId}/state`);
    return res.data;
  },
};

export default unreadApi;
