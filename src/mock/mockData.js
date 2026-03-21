// Mock kullanicilar
export const mockUsers = [
  { id: "u1", username: "demo", displayName: "Demo User", avatarUrl: null, bannerColor: "#5865F2", bannerUrl: null, bot: false },
  { id: "u2", username: "ayse", displayName: "Ayse Yilmaz", avatarUrl: null, bannerColor: "#EB459E", bannerUrl: null, bot: false },
  { id: "u3", username: "mehmet", displayName: "Mehmet Kaya", avatarUrl: null, bannerColor: "#57F287", bannerUrl: null, bot: false },
  { id: "u4", username: "musicbot", displayName: "Music Bot", avatarUrl: null, bannerColor: "#5865F2", bannerUrl: null, bot: true },
];

export const ME = mockUsers[0];

// Mock sunucular
export const mockServers = [
  { id: "s1", name: "Cluster Demo", iconUrl: null, bannerUrl: null, description: "Demo sunucusu", isPublic: true, defaultChannelId: "ch1", memberCount: 3, owner: mockUsers[0], categoriesJson: JSON.stringify([{ id: "cat1", name: "Genel", position: 0 }, { id: "cat2", name: "Ses", position: 1 }]) },
  { id: "s2", name: "Oyun Sunucusu", iconUrl: null, bannerUrl: null, description: "Oyun tartismalari", isPublic: true, defaultChannelId: "ch5", memberCount: 3, owner: mockUsers[1], categoriesJson: "[]" },
];

// Mock kanallar
export const mockChannels = {
  s1: [
    { id: "ch1", type: "TEXT", title: "genel", serverId: "s1", position: 0, categoryId: "cat1", botOnly: false, topic: "Genel sohbet kanali" },
    { id: "ch2", type: "TEXT", title: "duyurular", serverId: "s1", position: 1, categoryId: "cat1", botOnly: false, topic: null },
    { id: "ch3", type: "VOICE", title: "Sesli Sohbet", serverId: "s1", position: 0, categoryId: "cat2", botOnly: false },
    { id: "ch4", type: "THREAD", title: "Forum", serverId: "s1", position: 2, categoryId: "cat1", botOnly: false },
  ],
  s2: [
    { id: "ch5", type: "TEXT", title: "genel", serverId: "s2", position: 0, botOnly: false },
    { id: "ch6", type: "VOICE", title: "Oyun Odasi", serverId: "s2", position: 1, botOnly: false },
  ],
};

// Mock mesajlar
let msgIdCounter = 100;
export const mockMessages = {
  ch1: [
    { id: "m1", content: "Merhaba! Cluster'a hos geldiniz", sender: mockUsers[1], createdAt: new Date(Date.now() - 3600000).toISOString(), type: "TEXT", deleted: false, reactions: [{ emoji: "👋", count: 2, userIds: ["u2", "u3"] }] },
    { id: "m2", content: "Selam! Nasil gidiyor?", sender: mockUsers[2], createdAt: new Date(Date.now() - 3500000).toISOString(), type: "TEXT", deleted: false, reactions: [] },
    { id: "m3", content: "**Markdown** destegi var! `kod blogu`, ~~ustu cizili~~, ||spoiler||", sender: mockUsers[0], createdAt: new Date(Date.now() - 3000000).toISOString(), type: "TEXT", deleted: false, reactions: [] },
    { id: "m4", content: "```javascript\nconst hello = 'Cluster';\nconsole.log(hello);\n```", sender: mockUsers[1], createdAt: new Date(Date.now() - 2000000).toISOString(), type: "TEXT", deleted: false, reactions: [] },
    { id: "m5", content: "Harika bir platform! @demo", sender: mockUsers[2], createdAt: new Date(Date.now() - 1000000).toISOString(), type: "TEXT", deleted: false, reactions: [{ emoji: "❤️", count: 1, userIds: ["u1"] }] },
  ],
  ch2: [
    { id: "m10", content: "Yeni ozellikler eklendi!", sender: mockUsers[0], createdAt: new Date(Date.now() - 7200000).toISOString(), type: "TEXT", deleted: false, reactions: [] },
  ],
  ch5: [
    { id: "m20", content: "Bu aksam oyun var mi?", sender: mockUsers[2], createdAt: new Date(Date.now() - 600000).toISOString(), type: "TEXT", deleted: false, reactions: [] },
    { id: "m21", content: "Ben varim!", sender: mockUsers[1], createdAt: new Date(Date.now() - 300000).toISOString(), type: "TEXT", deleted: false, reactions: [] },
  ],
};

export function addMockMessage(channelId, content, sender) {
  msgIdCounter++;
  const msg = {
    id: `m${msgIdCounter}`,
    content,
    sender: sender || ME,
    createdAt: new Date().toISOString(),
    type: "TEXT",
    deleted: false,
    reactions: [],
  };
  if (!mockMessages[channelId]) mockMessages[channelId] = [];
  mockMessages[channelId].push(msg);
  return msg;
}

// Mock arkadaslar
export const mockFriends = [
  { relationId: "fr1", peer: mockUsers[1] },
  { relationId: "fr2", peer: mockUsers[2] },
];

// Mock DM kanallari
export const mockDmChannels = [
  { id: "dm1", type: "DM", isGroup: false, title: null, participants: [mockUsers[0], mockUsers[1]], lastMessage: { content: "Gorusuruz!", senderName: "Ayse", createdAt: new Date(Date.now() - 60000).toISOString() } },
  { id: "dm2", type: "DM", isGroup: true, title: "Proje Grubu", participants: [mockUsers[0], mockUsers[1], mockUsers[2]], memberCount: 3, lastMessage: { content: "Toplanti ne zaman?", senderName: "Mehmet", createdAt: new Date(Date.now() - 120000).toISOString() } },
];

// Mock members
export const mockMembers = [
  { user: mockUsers[0], roles: [{ id: "r1", name: "Owner", color: "#E74C3C" }] },
  { user: mockUsers[1], roles: [{ id: "r2", name: "Admin", color: "#3498DB" }] },
  { user: mockUsers[2], roles: [{ id: "r3", name: "Member", color: "#99AAB5" }] },
];

// Mock unread
export const mockUnread = { channels: { ch2: 1, ch5: 2 }, servers: { s2: 2 } };
