// src/services/friendsApi.js
import { api } from "../context/AuthContext";

const ENDPOINTS = {
  lookupByUsername: (username) => `/api/users/by-username?username=${encodeURIComponent(username)}`,
  sendFriendRequest: (userId) => `/api/friend-requests/${encodeURIComponent(userId)}`,
  incomingRequests: `/api/friend-requests/incoming`,
  outgoingRequests: `/api/friend-requests/outgoing`,
  acceptRequest: (reqId) => `/api/friend-requests/${reqId}/accept`,
  rejectRequest: (reqId) => `/api/friend-requests/${reqId}`,
  listFriends: `/api/friends`,
};

export const friendsApi = {
  async lookupExact(username) { return (await api.get(ENDPOINTS.lookupByUsername(username))).data; },
  async sendRequest(userId)   { return (await api.post(ENDPOINTS.sendFriendRequest(userId))).data; },
  async getIncoming()         { return (await api.get(ENDPOINTS.incomingRequests)).data; },
  async getOutgoing()         { return (await api.get(ENDPOINTS.outgoingRequests)).data; },
  async accept(reqId)         { return (await api.post(ENDPOINTS.acceptRequest(reqId))).data; },
  async reject(reqId)         { return (await api.delete(ENDPOINTS.rejectRequest(reqId))).data; },

  // ana liste
  async list()                { return (await api.get(ENDPOINTS.listFriends)).data; },
  async listFriends()         { return (await api.get(ENDPOINTS.listFriends)).data; },

  // arkadaş kaldır
  async remove(relationId)    { return (await api.delete(`/api/friends/${relationId}`)).data; },

  // block
  async block(userId)         { return (await api.post(`/api/blocks/${userId}`)).data; },
  async unblock(userId)       { return (await api.delete(`/api/blocks/${userId}`)).data; },
  async listBlocked()         { return (await api.get(`/api/blocks`)).data; },
};

export default friendsApi;
