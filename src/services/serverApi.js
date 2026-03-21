import { http } from "./http";

export const serverApi = {
  /** Kullanıcının üye olduğu sunucular */
  myServers: () => http.get("/api/servers/me").then((r) => r.data),

  /** Sunucu detayı */
  get: (serverId) => http.get(`/api/servers/${serverId}`).then((r) => r.data),

  /** Sunucu güncelle */
  update: (serverId, { name, description, iconUrl, isPublic, defaultChannelId }) =>
    http.patch(`/api/servers/${serverId}`, { name, description, iconUrl, isPublic, defaultChannelId }).then((r) => r.data),

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
  createChannel: (serverId, { title, type, categoryId, botOnly }) =>
    http.post(`/api/channels/server/${serverId}`, { title, type, categoryId, botOnly }).then((r) => r.data),

  /** Kanal yeniden adlandır */
  renameChannel: (channelId, title) =>
    http.patch(`/api/channels/${channelId}`, { title }).then((r) => r.data),

  /** Kanal sil */
  deleteChannel: (channelId) =>
    http.delete(`/api/channels/${channelId}`).then((r) => r.data),

  /** Kanal arka plan müziği yükle */
  uploadChannelMusic: (channelId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/api/channels/${channelId}/bg-music`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Kanal arka plan müziği sil */
  deleteChannelMusic: (channelId) =>
    http.delete(`/api/channels/${channelId}/bg-music`).then((r) => r.data),

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

  // ── Sunucu icon/banner ──

  /** Sunucu ikonu yükle */
  uploadIcon: (serverId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/api/servers/${serverId}/icon`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Sunucu ikonu sil */
  deleteIcon: (serverId) =>
    http.delete(`/api/servers/${serverId}/icon`).then((r) => r.data),

  /** Sunucu banner yükle */
  uploadBanner: (serverId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/api/servers/${serverId}/banner`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Sunucu banner sil */
  deleteBanner: (serverId) =>
    http.delete(`/api/servers/${serverId}/banner`).then((r) => r.data),

  /** Chat arka planı yükle */
  uploadChatBackground: (serverId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/api/servers/${serverId}/chat-background`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Chat arka planı sil */
  deleteChatBackground: (serverId) =>
    http.delete(`/api/servers/${serverId}/chat-background`).then((r) => r.data),

  /** Sunucu temasını güncelle */
  updateTheme: (serverId, themeJson) =>
    http.patch(`/api/servers/${serverId}/theme`, themeJson, {
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.data),

  // ── Rol yönetimi ──

  /** Sunucunun rollerini listele */
  listRoles: (serverId) =>
    http.get(`/api/servers/${serverId}/roles`).then((r) => r.data),

  /** Yeni rol oluştur */
  createRole: (serverId, { name, color, position, permissionsJson }) =>
    http.post(`/api/servers/${serverId}/roles`, { name, color, position, permissionsJson }).then((r) => r.data),

  /** Rol güncelle */
  updateRole: (serverId, roleId, { name, color, position, permissionsJson }) =>
    http.patch(`/api/servers/${serverId}/roles/${roleId}`, { name, color, position, permissionsJson }).then((r) => r.data),

  /** Rol sil */
  deleteRole: (serverId, roleId) =>
    http.delete(`/api/servers/${serverId}/roles/${roleId}`).then((r) => r.data),

  // ── Üye yönetimi ──

  /** Üyenin rolünü değiştir (tek veya çoklu) */
  updateMemberRole: (serverId, userId, roleId, roleIds) =>
    http.patch(`/api/servers/${serverId}/members/${userId}`, { roleId, roleIds }).then((r) => r.data),

  /** Üyeyi sunucudan at */
  removeMember: (serverId, userId) =>
    http.delete(`/api/servers/${serverId}/members/${userId}`).then((r) => r.data),

  /** Kendi sunucu profilimi getir */
  getMyServerProfile: (serverId) =>
    http.get(`/api/servers/${serverId}/members/me`).then((r) => r.data),

  /** Sunucu profilimi güncelle (nickname) */
  updateMyServerProfile: (serverId, { nickname }) =>
    http.patch(`/api/servers/${serverId}/members/me/profile`, { nickname }).then((r) => r.data),

  /** Sunucu avatarı yükle */
  uploadMyServerAvatar: (serverId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/api/servers/${serverId}/members/me/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Sunucu avatarımı sil */
  deleteMyServerAvatar: (serverId) =>
    http.delete(`/api/servers/${serverId}/members/me/avatar`).then((r) => r.data),

  /** Sunucu bannerı yükle */
  uploadMyServerBanner: (serverId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/api/servers/${serverId}/members/me/banner`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Sunucu bannerımı sil */
  deleteMyServerBanner: (serverId) =>
    http.delete(`/api/servers/${serverId}/members/me/banner`).then((r) => r.data),

  // ── Kanal izinleri ──

  /** Kanal izinlerini getir */
  /** Kanal detayı */
  getChannel: (channelId) =>
    http.get(`/api/channels/${channelId}`).then((r) => r.data),

  getChannelPermissions: (channelId) =>
    http.get(`/api/channels/${channelId}/permissions`).then((r) => r.data),

  /** Benim kanal izinlerimi getir */
  getMyChannelPermissions: (channelId) =>
    http.get(`/api/channels/${channelId}/permissions/me`).then((r) => r.data),

  /** Kanal izinlerini kaydet */
  setChannelPermissions: (channelId, permissions) =>
    http.put(`/api/channels/${channelId}/permissions`, permissions).then((r) => r.data),

  /** Denetim kayıtları */
  getAuditLogs: (serverId, { page = 0, size = 50, action, actorId } = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(size));
    if (action) params.set("action", action);
    if (actorId) params.set("actorId", actorId);
    return http.get(`/api/servers/${serverId}/audit-logs?${params}`).then((r) => r.data);
  },

  /** Sunucudan ayrıl */
  leave: (serverId) =>
    http.delete(`/api/servers/${serverId}/leave`).then((r) => r.data),

  /** Kanal sıralama — toplu pozisyon güncelleme */
  reorderChannels: (serverId, items) =>
    http.put(`/api/channels/server/${serverId}/reorder`, items).then((r) => r.data),

  /** Sunucuyu sil */
  delete: (serverId) =>
    http.delete(`/api/servers/${serverId}`).then((r) => r.data),

  /** Kanal güncelle (topic dahil) */
  patchChannel: (channelId, data) =>
    http.patch(`/api/channels/${channelId}`, data).then((r) => r.data),
};
