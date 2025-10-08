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
};

export default friendsApi;
