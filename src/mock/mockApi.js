import { mockUsers, mockServers, mockChannels, mockMessages, mockFriends, mockDmChannels, mockMembers, mockUnread, addMockMessage, ME } from "./mockData";

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

export function setupMockInterceptor(axiosInstance) {
  // Adapter override — request backend'e gitmeden mock response don
  axiosInstance.defaults.adapter = async (config) => {
    const url = config.url || "";
    const method = (config.method || "get").toLowerCase();
    const mock = await handleMock(method, url, config.data);
    return { data: mock !== undefined ? mock : {}, status: 200, statusText: "OK", headers: {}, config };
  };
}

async function handleMock(method, url, body) {
  await delay(50 + Math.random() * 100);

  // Auth
  if (url.includes("/api/auth/login")) return { token: "mock-token", accessToken: "mock-token", refreshToken: "mock-refresh", user: ME };
  if (url.includes("/api/auth/register")) return { token: "mock-token", accessToken: "mock-token", refreshToken: "mock-refresh", user: ME };
  if (url.includes("/api/auth/me")) return ME;
  if (url.includes("/api/auth/refresh")) return { token: "mock-token", accessToken: "mock-token", refreshToken: "mock-refresh" };
  if (url.includes("/api/auth/logout")) return {};

  // Users
  if (url.includes("/api/users/me") && method === "get") return { ...ME, settingsJson: "{}" };
  if (url.includes("/api/users/by-username")) return ME;

  // Servers
  if (url.match(/\/api\/servers\/me$/)) return mockServers;
  if (url.match(/\/api\/servers\/discover/)) return mockServers.filter((s) => s.isPublic);
  if (url.match(/\/api\/servers\/([^/]+)\/members$/) && method === "get") return mockMembers;
  if (url.match(/\/api\/servers\/([^/]+)\/roles/)) return [
    { id: "r1", name: "Owner", color: "#E74C3C", position: 100, managed: true, permissionsJson: "{}" },
    { id: "r2", name: "Admin", color: "#3498DB", position: 50, managed: false, permissionsJson: "{}" },
    { id: "r3", name: "Member", color: "#99AAB5", position: 0, managed: false, permissionsJson: "{}" },
  ];
  if (url.match(/\/api\/servers\/([^/]+)\/invites/)) return [];
  if (url.match(/\/api\/servers\/([^/]+)\/audit-logs/)) return { content: [], totalPages: 0 };
  if (url.match(/\/api\/servers\/([^/]+)\/bots\/commands/)) return [];
  if (url.match(/\/api\/servers\/([^/]+)\/bots/)) return [];
  if (url.match(/\/api\/servers\/([^/]+)\/automod/)) return { badWords: "", spamThreshold: 5 };
  if (url.match(/\/api\/servers\/([^/]+)\/posts\/pending/)) return [];
  if (url.match(/\/api\/servers\/([^/]+)\/posts/)) return { content: [], totalPages: 0 };
  if (url.match(/\/api\/servers\/([^/]+)$/)) {
    const id = url.match(/\/api\/servers\/([^/]+)$/)[1];
    return mockServers.find((s) => s.id === id) || mockServers[0];
  }

  // Channels
  if (url.match(/\/api\/channels\/server\/([^/]+)\/reorder/)) return { success: true };
  if (url.match(/\/api\/channels\/server\/([^/]+)$/)) {
    const sid = url.match(/\/api\/channels\/server\/([^/]+)$/)[1];
    return mockChannels[sid] || [];
  }
  if (url.match(/\/api\/channels\/([^/]+)\/messages\/pinned/)) return [];
  if (url.match(/\/api\/channels\/([^/]+)\/messages\/search/)) return [];
  if (url.match(/\/api\/channels\/([^/]+)\/messages\/upload/) && method === "post") {
    const chId = url.match(/\/api\/channels\/([^/]+)\/messages/)[1];
    return addMockMessage(chId, "Dosya yuklendi");
  }
  if (url.match(/\/api\/channels\/([^/]+)\/messages/) && method === "get") {
    const chId = url.match(/\/api\/channels\/([^/]+)\/messages/)[1];
    return mockMessages[chId] || [];
  }
  if (url.match(/\/api\/channels\/([^/]+)\/messages/) && method === "post") {
    const chId = url.match(/\/api\/channels\/([^/]+)\/messages/)[1];
    let content = "";
    try { content = typeof body === "string" ? JSON.parse(body).content : body?.content || ""; } catch {}
    return addMockMessage(chId, content);
  }
  if (url.match(/\/api\/channels\/([^/]+)\/threads/)) return [];
  if (url.match(/\/api\/channels\/([^/]+)\/permissions\/me/)) return { canRead: true, canWrite: true, canManage: true };
  if (url.match(/\/api\/channels\/([^/]+)\/permissions/)) return [];
  if (url.match(/\/api\/channels\/([^/]+)\/state\/read/)) return { lastReadMessageId: null };
  if (url.match(/\/api\/channels\/([^/]+)\/state/)) return { lastReadMessageId: null, muted: false, notifyLevel: "ALL" };
  if (url.match(/\/api\/channels\/([^/]+)\/members/)) {
    return mockUsers.slice(0, 3).map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl }));
  }
  if (url.match(/\/api\/channels\?type=DM/)) return mockDmChannels;
  if (url.match(/\/api\/channels\/dm\/ensure/)) return mockDmChannels[0];
  if (url.match(/\/api\/channels\/([^/]+)$/)) {
    const chId = url.match(/\/api\/channels\/([^/]+)$/)[1];
    const all = Object.values(mockChannels).flat();
    return all.find((c) => c.id === chId) || mockDmChannels.find((c) => c.id === chId) || { id: chId, type: "TEXT", title: "kanal" };
  }

  // Friends
  if (url.includes("/api/friends") && method === "get") return mockFriends;
  if (url.includes("/api/friend-requests/incoming")) return [];
  if (url.includes("/api/friend-requests/outgoing")) return [];
  if (url.includes("/api/blocks") && method === "get") return [];

  // Unread
  if (url.includes("/api/unread/summary")) return mockUnread;
  if (url.match(/\/api\/unread\/channels\//)) return { unreadCount: 0 };

  // Presence
  if (url.includes("/api/presence/bulk")) return { u1: "online", u2: "online", u3: "idle" };
  if (url.includes("/api/presence/me")) return { status: "online" };

  // LiveKit
  if (url.includes("/api/livekit/token")) return { token: "mock-livekit-token" };
  if (url.includes("/api/livekit/participants")) return [];
  if (url.includes("/api/livekit/join")) return { success: true };
  if (url.includes("/api/livekit/leave")) return { success: true };

  // Posts
  if (url.includes("/api/posts/feed")) return { content: [], totalPages: 0 };
  if (url.includes("/api/posts/discover")) return { content: [], totalPages: 0 };
  if (url.includes("/api/posts/trending")) return [];
  if (url.includes("/api/posts/suggested-servers")) return [];

  // Bots
  if (url.includes("/api/bots/public")) return [];
  if (url.includes("/api/bots/me")) return [];

  // Link preview
  if (url.includes("/api/link-preview")) return null;

  console.log("[MockAPI] unhandled:", method.toUpperCase(), url);
  return {};
}
