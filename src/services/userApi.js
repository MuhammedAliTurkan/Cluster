import { http } from "./http";

export const userApi = {
  /** Profil bilgisini getir */
  getMe: () => http.get("/api/users/me").then((r) => r.data),

  /** Profil güncelle */
  updateMe: ({ displayName, avatarUrl, bannerColor, bannerUrl, settingsJson }) =>
    http.patch("/api/users/me", { displayName, avatarUrl, bannerColor, bannerUrl, settingsJson }).then((r) => r.data),

  /** Avatar yükle */
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post("/api/users/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  /** Avatar sil */
  deleteAvatar: () => http.delete("/api/users/me/avatar").then((r) => r.data),

  /** Banner sil */
  deleteBanner: () => http.delete("/api/users/me/banner").then((r) => r.data),

  /** Banner yükle */
  uploadBanner: (file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post("/api/users/me/banner", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};
