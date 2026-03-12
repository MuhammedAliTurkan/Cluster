import { http } from "./http";

export const userApi = {
  /** Profil bilgisini getir */
  getMe: () => http.get("/api/users/me").then((r) => r.data),

  /** Profil güncelle */
  updateMe: ({ displayName, avatarUrl, settingsJson }) =>
    http.patch("/api/users/me", { displayName, avatarUrl, settingsJson }).then((r) => r.data),

  /** Avatar yükle */
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post("/api/users/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};
