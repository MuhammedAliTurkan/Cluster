import { http } from "./http";

// Bot CRUD
export const createBot = (data) => http.post("/api/bots", data).then((r) => r.data);
export const getMyBots = () => http.get("/api/bots/me").then((r) => r.data);
export const getBot = (botId) => http.get(`/api/bots/${botId}`).then((r) => r.data);
export const updateBot = (botId, data) => http.patch(`/api/bots/${botId}`, data).then((r) => r.data);
export const deleteBot = (botId) => http.delete(`/api/bots/${botId}`);

// Bot Token Management
export const createBotToken = (botId, data) => http.post(`/api/bots/${botId}/tokens`, data).then((r) => r.data);
export const listBotTokens = (botId) => http.get(`/api/bots/${botId}/tokens`).then((r) => r.data);
export const revokeBotToken = (botId, tokenId) => http.delete(`/api/bots/${botId}/tokens/${tokenId}`);

// Bot Installation (server-level)
export const installBot = (serverId, botUserId, scopes) =>
    http.post(`/api/servers/${serverId}/bots`, { botUserId, scopes }).then((r) => r.data);
export const listInstalledBots = (serverId) => http.get(`/api/servers/${serverId}/bots`).then((r) => r.data);
export const uninstallBot = (serverId, botUserId) => http.delete(`/api/servers/${serverId}/bots/${botUserId}`);

// Bot Commands
export const getServerBotCommands = (serverId) => http.get(`/api/servers/${serverId}/bots/commands`).then((r) => r.data);
export const getBotCommands = (botId) => http.get(`/api/bots/${botId}/commands`).then((r) => r.data);

// Public Bot Discovery
export const listPublicBots = () => http.get("/api/bots/public").then((r) => r.data);
export const getPublicBot = (botId) => http.get(`/api/bots/${botId}/public`).then((r) => r.data);

// Available scopes
export const BOT_SCOPES = [
    { key: "READ_MESSAGES", label: "Mesajları Oku" },
    { key: "SEND_MESSAGES", label: "Mesaj Gönder" },
    { key: "MANAGE_MESSAGES", label: "Mesajları Yönet" },
    { key: "READ_MEMBERS", label: "Üyeleri Gör" },
    { key: "KICK_MEMBERS", label: "Üye At" },
    { key: "BAN_MEMBERS", label: "Üye Yasakla" },
    { key: "MANAGE_ROLES", label: "Rolleri Yönet" },
    { key: "READ_SERVER_INFO", label: "Sunucu Bilgisi Oku" },
    { key: "MANAGE_CHANNELS", label: "Kanalları Yönet" },
    { key: "MANAGE_SERVER", label: "Sunucu Ayarları" },
    { key: "RECEIVE_EVENTS", label: "Olayları Al" },
    { key: "READ_PRESENCE", label: "Durum Bilgisi Oku" },
];
