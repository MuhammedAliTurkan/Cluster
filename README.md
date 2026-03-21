# Cluster

**Yeni nesil iletisim platformu** — Sesli, goruntulu ve yazili iletisimi tek catida birlestiren, Discord alternatifi iletisim uygulamasi.

**Canli Demo:** [https://clusterdemo.vercel.app](https://clusterdemo.vercel.app)

> Uygulama aktif gelistirme asamasindadir ve yakin zamanda tam surumu ile servis edilecektir.

---

## Ozellikler

### Mesajlasma
- Anlik mesajlasma (WebSocket/STOMP)
- Markdown destegi (bold, italic, kod blogu, tablo, basliklar)
- Syntax highlighted kod bloklari (50+ dil)
- Spoiler tag, Emoji picker, @Mention autocomplete
- Mesaj duzenleme, silme, yanitlama, sabitleme
- Thread/Konu sistemi (forum tarzi)
- Dosya paylasimi (resim, video, ses, dokuman)
- Resim goruntuleyici (zoom, surukle, tam ekran)
- Link onizleme, mesaj arama, typing indicator
- Okunmamis mesaj sayaci, infinite scroll

### Ses ve Goruntu
- LiveKit tabanli sesli kanallar
- Goruntulu arama (1:1 ve grup)
- Ekran paylasimi + Picture-in-Picture
- Kamera/mikrofon kalite ayarlari, Push-to-talk

### Sunucu Yonetimi
- Kanal yonetimi (yazi, ses, video, gonderi, konu)
- Kanal kategorileri, siralama (surukle-birak), topic
- Rol sistemi (24 izin, 6 grup, renk, drag-drop)
- Uye yonetimi (kick, ban, timeout, rol atama)
- Davet sistemi, denetim kaydi, otomatik moderasyon
- Sunucu kesfi, sunucu klasorleri

### Sosyal
- Arkadas sistemi, engelleme, DM ve Grup DM
- Kullanici profili (avatar, banner, durum)
- Presence sistemi (online/idle/dnd/invisible)

### Gonderi Sistemi
- Gorsel paylasimi (carousel), begeni ve yorum
- Kesfet sayfasi (kare grid + dikey akis)
- Reklam alani (AdSense + sponsorlu post)

### Bot Sistemi
- Bot API, bot kesfi, sunucuya bot yukleme
- Muzik botu, moderasyon botu, karsilama botu

---

## Teknik Yapi

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, STOMP.js |
| Backend | Spring Boot 3.5, Java 21, PostgreSQL, JWT |
| Ses/Goruntu | LiveKit (WebRTC SFU), Docker |
| Mesajlasma | WebSocket (STOMP/SockJS) |

---

## Demo

Demo surumunde backend baglantisi gerekmez — mock veri ile calisir. Herhangi bir bilgi ile giris yapabilirsiniz.

```bash
npm install --legacy-peer-deps
npm run dev
```

---

## Lisans

Bu proje ozel mulkiyettir. Izinsiz kopyalama, dagitma veya ticari kullanim yasaktir.

---

**Cluster** — Iletisimin gelecegi.
