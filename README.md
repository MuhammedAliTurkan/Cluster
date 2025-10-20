# 🌐 Cluster — Modern Discord-Style Chat Platform

**Cluster**; gerçek zamanlı iletişim, sunucular, kanallar, mesajlaşma ve medya paylaşımı özelliklerini barındıran, **Discord benzeri** bir açık kaynak sohbet uygulamasıdır.  
Backend **Spring Boot + PostgreSQL + WebSocket (STOMP)**, frontend ise **React (Vite) + TailwindCSS + TypeScript** ile geliştirilmiştir.

---

## 🚀 Özellikler

### 💬 Sohbet & Kanal Sistemi
- DM (Direct Message) ve grup sohbetleri  
- Sunucu (server) ve kanal yönetimi *(geliştirme aşamasında)*  
- Gerçek zamanlı mesaj senkronizasyonu (STOMP WebSocket)  
- Okunma durumu, sessize alma ve son görülme mantıkları *(geliştirme aşamasında)*  

### 🎧 Medya & Ses *(geliştirme aşamasında)*
- Jitsi tabanlı video/ses görüşmeleri (lib-jitsi-meet)  
- Mikrofon, kulaklık ve ses durumu kontrolü (tray sistemi)  
- Çoklu kullanıcı odaları ve ekran paylaşımı  

### 👥 Kullanıcı & Kimlik
- JWT tabanlı kimlik doğrulama  
- Profil yönetimi (avatar, kullanıcı adı, durum) *(geliştirme aşamasında)*  
- Arkadaşlık sistemi ve DM entegrasyonu  

### 🎨 Arayüz
- Tamamen **React + TailwindCSS** ile responsive arayüz  
- Discord tarzı modern, koyu tema  
- Sidebar, tray, kanal listeleri ve hover efektli kartlar *(geliştirme aşamasında)* 

---

## 📸 Ekran Görüntüleri

<p align="center">
  <img width="334" height="113" alt="Arkadaşlık İstekleri" src="https://github.com/user-attachments/assets/c79c7c43-e70f-4bf8-a25b-8e8bc3a093ef" />
  <br/>
  <em>🔔 Arkadaşlık İstekleri Ekranı — Gelen istekleri yönetme (kabul / reddet)</em>
</p>

---

<p align="center">
  <img width="500" height="500" alt="Arkadaşlar Ekranı" src="https://github.com/user-attachments/assets/70471bc7-be6f-4181-bbf1-cadeabb7fce7" />
  <br/>
  <em>👥 Arkadaşlar Sayfası — Listeleme, arama ve DM başlatma</em>
</p>

---

<p align="center">
  <img width="500" height="500" alt="DM Ekranı" src="https://github.com/user-attachments/assets/18f22e41-5376-46c7-930b-406be6c453c5" />
  <br/>
  <em>💬 Direkt Mesaj (DM) Ekranı — Gerçek zamanlı birebir sohbet</em>
</p>

---

<p align="center">
  <img width="500" height="500" alt="Sunucu & Keşif Ekranı" src="https://github.com/user-attachments/assets/29247e2d-4c24-4dea-84ba-8af752fa5517" />
  <br/>
  <em>🌐 Sunucu Keşfi — Sunuculara göz atma ve katılma görünümü</em>
</p>

---

<p align="center">
  <img src="./assets/Messaging.gif" alt="Messaging Demo" width="800" />
  <br/>
  <em>⚡ Gerçek zamanlı mesajlaşma demosu</em>
</p>

---

## 🧠 Teknolojiler
| Katman | Teknolojiler |
|:-------|:--------------|
| **Backend** | Spring Boot, JWT, WebSocket (STOMP), PostgreSQL, JPA |
| **Frontend** | React (Vite), TailwindCSS, Axios, React Router |
| **Medya** | Jitsi (lib-jitsi-meet) |
| **Gerçek Zamanlı** | STOMP WebSocket / SockJS |

---

## 🔒 Güvenlik Özellikleri
- JWT tabanlı kimlik doğrulama  
- Token validasyon ve `@Valid` ile input doğrulama  
- Kullanıcı bazlı yetki kontrolü (DM, sunucu erişimleri)  
- UUID ID sistemi (tahmin edilemez kimlikler)  
- Transaction ve Exception yönetimi  

---




