import { http } from "./http";

export const postApi = {
  // Server posts
  createPost: (serverId, { description, visibility, images }) => {
    const fd = new FormData();
    fd.append("description", description || "");
    fd.append("visibility", visibility || "SERVER");
    images.forEach((f) => fd.append("images", f));
    return http.post(`/api/servers/${serverId}/posts`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  listServerPosts: (serverId, page = 0, size = 20) =>
    http.get(`/api/servers/${serverId}/posts?page=${page}&size=${size}`).then((r) => r.data),

  // Single post
  getPost: (postId) => http.get(`/api/posts/${postId}`).then((r) => r.data),
  updatePost: (postId, data) => http.patch(`/api/posts/${postId}`, data).then((r) => r.data),
  deletePost: (postId) => http.delete(`/api/posts/${postId}`).then((r) => r.data),

  // Like
  toggleLike: (postId) => http.post(`/api/posts/${postId}/like`).then((r) => r.data),

  // Comments
  listComments: (postId, page = 0) =>
    http.get(`/api/posts/${postId}/comments?page=${page}&size=30`).then((r) => r.data),
  addComment: (postId, content) =>
    http.post(`/api/posts/${postId}/comments`, { content }).then((r) => r.data),
  deleteComment: (postId, commentId) =>
    http.delete(`/api/posts/${postId}/comments/${commentId}`).then((r) => r.data),

  // Public onay sistemi
  requestPublic: (postId) => http.post(`/api/posts/${postId}/request-public`).then((r) => r.data),
  approvePublic: (postId) => http.post(`/api/posts/${postId}/approve-public`).then((r) => r.data),
  rejectPublic: (postId) => http.post(`/api/posts/${postId}/reject-public`).then((r) => r.data),
  listPending: (serverId) => http.get(`/api/servers/${serverId}/posts/pending`).then((r) => r.data),

  // Sidebar içerikler
  trending: (limit = 5) => http.get(`/api/posts/trending?limit=${limit}`).then((r) => r.data),
  suggestedServers: (limit = 5) => http.get(`/api/posts/suggested-servers?limit=${limit}`).then((r) => r.data),

  // Feed & Discover
  feed: (page = 0, size = 20) =>
    http.get(`/api/posts/feed?page=${page}&size=${size}`).then((r) => r.data),
  discover: (page = 0, size = 20) =>
    http.get(`/api/posts/discover?page=${page}&size=${size}`).then((r) => r.data),
};
