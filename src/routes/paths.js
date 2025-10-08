export const paths = {
  root: "/app",
  friends: "/app/friends",
  dm: (uid) => `/app/friends/${uid}`,
  voice: (cid) => `/app/voice/${cid}`,
  video: (rid) => `/app/video/${rid}`,
  chat: "/app/chat",
  discover: "/app/discover",
  serverHub: "/app/server-hub",       // ⭐ eklendi
};
