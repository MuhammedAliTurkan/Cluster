import { http } from "./http";

export const serverApi = {
  /** Kullanıcının üye olduğu sunucular */
  myServers: () => http.get("/api/servers/me").then((r) => r.data),

  /** Sunucu detayı */
  get: (serverId) => http.get(`/api/servers/${serverId}`).then((r) => r.data),

  /** Sunucu güncelle */
  update: (serverId, { name, description, iconUrl, isPublic }) =>
    http.patch(`/api/servers/${serverId}`, { name, description, iconUrl, isPublic }).then((r) => r.data),

  /** Sunucu oluştur */
  create: ({ name, description, iconUrl, isPublic = false }) =>
    http.post("/api/servers", { name, description, iconUrl, isPublic }).then((r) => r.data),

  /** Public sunucuları keşfet */
  discover: (query) =>
    http.get("/api/servers/discover", { params: query ? { query } : {} }).then((r) => r.data),

  /** Public sunucuya direkt katıl */
  joinPublic: (serverId) =>
    http.post(`/api/servers/${serverId}/join`).then((r) => r.data),

  /** Sunucu kanallarını listele */
  channels: (serverId) =>
    http.get(`/api/channels/server/${serverId}`).then((r) => r.data),

  /** Sunucu üyelerini listele */
  members: (serverId) =>
    http.get(`/api/servers/${serverId}/members`).then((r) => r.data),

  /** Kanal oluştur */
  createChannel: (serverId, { title, type }) =>
    http.post(`/api/channels/server/${serverId}`, { title, type }).then((r) => r.data),

  /** Kanal sil */
  deleteChannel: (channelId) =>
    http.delete(`/api/channels/${channelId}`).then((r) => r.data),

  // ── Davet sistemi ──

  /** Davet kodu oluştur */
  createInvite: (serverId, { maxUses = 0, expiresInMinutes = 0 } = {}) =>
    http.post(`/api/servers/${serverId}/invites`, { maxUses, expiresInMinutes }).then((r) => r.data),

  /** Sunucunun davet kodlarını listele */
  listInvites: (serverId) =>
    http.get(`/api/servers/${serverId}/invites`).then((r) => r.data),

  /** Davet kodu ile sunucu bilgisi önizle */
  previewInvite: (code) =>
    http.get(`/api/invites/${code}`).then((r) => r.data),

  /** Davet kodu ile sunucuya katıl */
  joinByCode: (code) =>
    http.post(`/api/invites/${code}/join`).then((r) => r.data),

  /** Davet kodunu sil */
  deleteInvite: (inviteId) =>
    http.delete(`/api/invites/${inviteId}`).then((r) => r.data),
};
