# Architecture

```mermaid
flowchart LR
  U[Customer browser] -->|HTTPS| FD[Azure Front Door CDN/WAF]
  FD --> SF[Next.js storefront]
  SF -->|Store API| API[Medusa API]
  A[Owner/admin] --> FD --> ADM[Medusa Admin]
  ADM --> API
  API --> PG[(PostgreSQL)]
  API --> RD[(Redis: events, queues, cache)]
  API --> MS[Meilisearch]
  API --> BL[(Azure Blob media)]
  W[Medusa worker] --> PG
  W --> RD
  API <-->|orders, webhooks| RZ[Razorpay]
  API <-->|AWB, tracking webhooks| SR[Shiprocket]
  API --> EM[Resend email]
  API --> SMS[MSG91 OTP/SMS]
```

| Service                         | Local port          |
| ------------------------------- | ------------------- |
| Storefront                      | 8000                |
| Medusa API / Admin              | 9000 / 9000/app     |
| Postgres / Redis                | 5432 / 6379         |
| Meilisearch / Azurite / Mailpit | 7700 / 10000 / 8025 |

Principles: Medusa owns catalog, cart, order, payment, fulfillment; we extend it with modules in `apps/backend/src/modules`. The server computes every amount. Webhooks are signature-verified and idempotent. Business rules (shipping, COD, GST bands, returns) are admin config, not code constants.
