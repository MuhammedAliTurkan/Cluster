


 # Cluster — Real-time Communication Platform
 
  **Canli Demo:** [https://clusterdemo.vercel.app](https://clusterdemo.vercel.app)
  

  > Sesli, görüntülü ve metin tabanlı topluluk iletişim platformu.
  > Spring Boot mikroservis backend · React 19 frontend · WebRTC medya katmanı.

  [![Java](https://img.shields.io/badge/Java-21-orange)]()
  [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen)]()
  [![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2024.0-green)]()
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)]()
  [![Kafka](https://img.shields.io/badge/Apache%20Kafka-3.x-black)]()
  [![Redis](https://img.shields.io/badge/Redis-7-red)]()
  [![Docker](https://img.shields.io/badge/Docker-compose-2496ED)]()

  ---

  ## Özellikler

  - **Topluluk sunucuları** — kanal hiyerarşisi, rol & izin yönetimi (24 ayrı izin)
  - **Mesajlaşma** — metin, dosya, GIF, sesli klip, mention, reply, edit/delete
  - **Sesli & görüntülü görüşme** — grup voice, video, ekran paylaşımı, kalite ayarları
  - **Direct Message** — birebir mesajlaşma + arkadaş sistemi
  - **Presence** — online / idle / dnd / invisible, custom status (emoji + metin + süre)
  - **Forum, Duyuru, Stage** kanal tipleri
  - **Webhook & Bot ekosistemi** — opaque token auth, scope-based izin, rate-limited API
  - **Server Discovery, Vanity URL, Doğrulama Seviyeleri**
  - **AutoMod** — yapılandırılabilir mesaj filtreleme kuralları
  - **Sunucu & bot analitik dashboard**
  - **Dockable panel UI** — drag-and-drop pencere yönetimi, tema desteği (Dark/Light/AMOLED)

  ---

  ## Mimari

  ```mermaid
  flowchart TB
      FE["Web Client<br/>React 19 · Vite"]
      GW["API Gateway<br/>Spring Cloud Gateway"]

      AUTH["Auth Service<br/>JWT issue / refresh"]
      USER["User Service<br/>profile · friends · presence"]
      CHAT["Chat Service<br/>message · mention"]
      SRV["Server Service<br/>channel · permission · webhook · bot"]
      MEDIA["Media Service<br/>WebRTC token · recording"]

      PGA[("PostgreSQL")]
      PGU[("PostgreSQL")]
      PGC[("PostgreSQL")]
      PGS[("PostgreSQL")]
      PGM[("PostgreSQL")]

      KAFKA{{"Apache Kafka<br/>event bus"}}
      REDIS{{"Redis<br/>cache · rate limit"}}
      SFU{{"WebRTC SFU"}}

      FE -- "HTTPS / WSS" --> GW
      GW --> AUTH
      GW --> USER
      GW --> CHAT
      GW --> SRV
      GW --> MEDIA

      AUTH --> PGA
      USER --> PGU
      CHAT --> PGC
      SRV  --> PGS
      MEDIA --> PGM

      CHAT <--> KAFKA
      USER <--> KAFKA
      SRV  <--> KAFKA

      SRV  --> REDIS
      CHAT --> REDIS

      MEDIA --> SFU
      FE -- "WebRTC" --> SFU

      classDef svc fill:#1e3a5f,stroke:#4a90e2,color:#fff
      classDef db fill:#2d5016,stroke:#7cb342,color:#fff
      classDef infra fill:#5d4037,stroke:#ff9800,color:#fff
      class AUTH,USER,CHAT,SRV,MEDIA,GW svc
      class PGA,PGU,PGC,PGS,PGM db
      class KAFKA,REDIS,SFU infra
  ```

  **Mikroservisler:** service discovery, centralized config, API gateway, auth, user, chat, server, media, admin — her servis kendi **bounded context**'ine
  ait izole veritabanı ile çalışır. Servisler arası iletişim için event-driven Kafka (event bus) ve dayanıklı service-to-service REST.

  ---

  ## Teknik Özellikler

  ### Domain-Driven Design
  Her mikroservis kendi bounded context'inde izole. Aggregate root'lar, value object'ler ve domain event'ler net ayrılmış. Servis bazında ayrı şema
  (`cluster_auth`, `cluster_user`, `cluster_chat`, `cluster_server`, `cluster_media`) — cross-service join yok, sadece event-driven sync.

  ### Event-Driven Messaging
  - **Idempotent Kafka producer** (`enable.idempotence`, `acks=all`)
  - **Dead Letter Topic (DLT)** ile başarısız mesajların izole edilmesi + retry policy
  - Non-retryable exception filtering (deserialization hatası → DLT'ye direkt)

  ### Performans & Dayanıklılık
  - Redis tabanlı **per-resource rate limiting** (sliding window, atomic)
  - Service-to-service çağrılarda **timeout + retry + exponential backoff**
  - N+1 query elemesi, composite index, cursor-based message pagination
  - Soft-delete + CASCADE policy

  ### Güvenlik
  - **Defense in depth** — gateway-level + service-level cross-validation
  - Stateless JWT (access + refresh) + WebSocket auth interceptor
  - Bot API için **opaque token** + scope-based authorization + rate limit
  - **Prod-config validation** — runtime'da kritik secret'ların geçerliliği startup'ta doğrulanır, dev-placeholder ile prod'a açılış engellenir
  - Standard OWASP Top 10 mitigations

  ### Real-time
  - **STOMP over WebSocket** — mesajlaşma, presence, call signaling
  - **WebRTC SFU** — voice, video, screen share (TLS-terminated)
  - Multi-device session desteği

  ### Test
  JUnit 5, Mockito, MockMvc, MockRestServiceServer ile unit + integration test coverage. Kritik akışlar (auth, retry logic, rate limiter, event publishing)
  test-driven.

  ---

  ## Stack

  | Katman             | Teknoloji                                                |
  |--------------------|----------------------------------------------------------|
  | Dil & Runtime      | Java 21                                                  |
  | Framework          | Spring Boot 3.5, Spring Cloud 2024.0, Spring Security    |
  | DB                 | PostgreSQL 16, JPA / Hibernate                           |
  | Mesajlaşma         | Apache Kafka, STOMP over WebSocket                       |
  | Cache & Rate Limit | Redis 7                                                  |
  | Media              | WebRTC SFU                                               |
  | Container          | Docker, docker-compose                                   |
  | Frontend           | React 19, Vite, STOMP.js, Axios, Tailwind CSS            |
  | Test               | JUnit 5, Mockito, MockMvc                                |

  ---

  ## Roadmap

  - [x] Mikroservis ayrıştırma + service discovery + API gateway
  - [x] Stateless auth + WebSocket auth
  - [x] Voice / video / screen share
  - [x] Event-driven inter-service messaging (DLT + idempotent producer)
  - [x] Rate limiting
  - [x] Webhook + Bot platformu (scope + token + rate limit)
  - [x] Role & permission sistemi
  - [ ] Kubernetes manifests + Helm chart
  - [ ] Distributed tracing
  - [ ] Centralized logging

  ---
