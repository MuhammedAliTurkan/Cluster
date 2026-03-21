import { api } from "../context/AuthContext";

export async function fetchBulkPresence(userIds) {
  const { data } = await api.post("/api/presence/bulk", { userIds });
  return data; // { userId: "online"|"offline"|"idle"|"dnd" }
}

export async function fetchMyPresence() {
  const { data } = await api.get("/api/presence/me");
  return data.status;
}
