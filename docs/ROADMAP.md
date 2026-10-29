# ZhanFinance JF-1C — Roadmap будущих планов

**Актуальность**: октябрь 2026  
**Статус системы**: Production-ready v1.1.0. 371 backend-тест (100% PASS), 214 frontend-тестов (100% PASS), 22 mobile-теста (100% PASS), 89 telegram bot тестов (100% PASS) — 696+ тестов GREEN.

---

## Текущая точка отсчёта

| Модуль | Статус |
|---|---|
| Auth, 2FA (TOTP), Google OAuth, Gmail OTP | Done |
| Multi-Device Refresh Token Family (RFC 6819, 5 сессий) | Done |
| CRM (Task, Stage, Pipeline, Pool, Kanban) | Done |
| Billing v1 (ручная оплата Kaspi / банк, Cloudflare R2, 4 тарифа) | Done |
| LMS (Course, Chapter, Lesson, Certificate, Quiz) | Done |
| Documents (PDF, Thymeleaf, опциональная подпись) | Done |
| Chat (STOMP/SockJS, WebSocket ACL) | Done |
| Telegram Bot Microservice (zhan-finance-tgbot, порт 8081) | Done |
| Epic-22: Android Native Monolith (zhan-finance-android, Expo 52, MMKV, Mutex, Push) | Done |
| NFR Specification (docs/NFR.md: SLA, SLO, Latency Budgets, Zero-Redis) | Done |
| Landing (4 языка, i18n 100%, 4 тарифа, команда, FAQ) | Done |
| Advisor-роль | Done |
| Dashboard Analytics | Done |
| CI/CD (GitHub Actions, GitHub Pages) | Done |
| Мониторинг (Prometheus, UptimeRobot) | Done |

---

## P0 — Критические задачи (Hardening) — все задачи закрыты

Все 12 задач P0 выполнены:

- Refresh-token lifecycle: reuse detection, replay protection, grace period 15с (RFC 6819)
- PAID invoice immutability + Invoice state machine с явными transitions
- Enum -> HTTP 400 (`GlobalExceptionHandler`, `HttpMessageNotReadableException`)
- PostgreSQL 17 в docker-compose, Flyway CI validation (checksum)
- Backup restore drill: runbook + CI workflow, ephemeral PG + smoke tests
- SECURITY.md, CURRENT_STATE.md — созданы
- Default secrets fail-fast (`INTERNAL_BOT_TOKEN`, `JWT_SECRET`)
- JaCoCo threshold 52% (0.52), 363 backend-теста PASS
- WebSocket ACL: senderId из Principal, чужой topic = reject

---

## P1 — Архитектурный долг (все задачи закрыты)

Все 15 задач P1 выполнены в рамках предыдущих сессий:

- Task State Machine, Optimistic Locking, Race-condition-safe Task Pool pickup
- Outbox pattern (AFTER_COMMIT @Async), Cloudflare R2 с fallback на PostgreSQL
- Idempotency Service (24h, putIfAbsent), ArchUnit boundary tests
- OpenAPI -> TypeScript codegen, ShedLock на 5 шедулерах
- Unified ApiErrorResponse, BigDecimal + NUMERIC для billing
- Distributed Rate Limiting (Bucket4j), 2FA mandatory для ADMIN
- Audit trail при REJECTED/REOPENED, BillingInvariant + TaskConcurrency тесты

---

## P2 — Долгосрочный roadmap (квартал+)

| # | Задача | Область | Трудоёмкость |
|---|---|---|---|
| P2-1 | Staging environment на Fly.io с отдельными secrets | DevOps | L |
| P2-2 | Cursor pagination для audit, chat, notifications (вместо OFFSET) | Backend | M |
| P2-3 | Audit table range partitioning при 10M+ строках | DB | M |
| P2-4 | SBOM на release: CycloneDX Gradle plugin | CI/CD | S |
| P2-5 | Dependabot: automated dependency updates | GitHub | XS |
| P2-6 | Container scanning: Trivy в CI на Docker image | CI/CD | S |
| P2-7 | ADR-документы: monolith, jwt, postgresql, r2, websocket | Docs | M |
| P2-8 | Semver release: убрать 0.0.1-SNAPSHOT, ввести 0.9.0 + CHANGELOG | Build | S |
| P2-9 | Document versioning: version + SHA-256 checksum | Backend + DB | M |
| P2-10 | Soft delete: `deleted_at / deleted_by` для Invoice, Document, Client | DB + Backend | M |
| P2-11 | PII inventory: классификация полей + retention policy | Docs + Backend | M |
| P2-12 | Log sanitization: автомаскировка JWT/токенов/паролей в логах | Infrastructure | S |
| P2-13 | Backward-compatible migrations: Expand -> Deploy -> Contract | Process | S |
| P2-14 | Preview environments для PR на Fly.io | CI/CD | L |
| P2-15 | Formal DR plan: RPO/RTO + restore drill в CI | Docs + Ops | M |
| P2-16 | Invoice line model: `InvoiceLine[]` с quantity, unitPrice, taxRate | DB + Backend | L |
| P2-17 | File upload hardening: magic bytes, quarantine state, zip bomb protection | Backend | M |
| P2-18 | PDF generation limits: CPU/memory/page count/timeout на OpenHTMLToPDF | Backend | S |
| P2-19 | CORS audit: нет `*` при `credentials=true` | SecurityConfig | S |
| P2-20 | Observability stack: Grafana + Tempo + Loki поверх OTEL | DevOps | L |

**Итого P2**: ~150+ часов

---

## Epic-12 — Payments: Kaspi Pay API + WebKassa (фискализация)

> Детальный план: [01-billing-webkassa-kaspi-pay-integration.md](future/01-billing-webkassa-kaspi-pay-integration.md)

### Суть задачи

Billing v1 (текущий) принимает ручную оплату: клиент переводит по Kaspi QR или реквизитам, бухгалтер фиксирует чек вручную. Billing v2 автоматизирует весь цикл:

```
Клиент нажимает "Оплатить" 
  -> JF-1C создает удаленный счет в Kaspi Pay API
  -> Клиент подтверждает в приложении Kaspi.kz
  -> Kaspi присылает Webhook (HMAC-валидация)
  -> JF-1C фиксирует PAID + записывает в payment_outbox
  -> Асинхронный воркер фискализирует чек в WebKassa API
  -> WebKassa передает данные в ОФД КГД МФ РК
  -> Клиент получает фискальный чек по email / WebSocket
```

### Правовое основание

- Ст. 166 НК РК: обязательное применение КМ с ФПД.
- Kaspi Pay формирует банковскую квитанцию, фискальный чек обязан выбить сам налогоплательщик.
- Несвоевременная фискализация: штраф 15-50 МРП по ст. 284 КоАП РК.

### Новые сущности в БД

- `payment_gateways` — настройки шлюзов (AES-GCM-256 credentials)
- `cash_registers` — кассы WebKassa (номер, смена, статус)
- `payment_outbox` — очередь фискализации с exponential backoff
- Расширение `invoices`: `external_payment_id`, `fiscal_status`, `fiscal_sign`, `ofd_check_url`

### Ключевые компоненты

- `KaspiPayWebhookController` — HMAC-валидация входящих уведомлений
- `PaymentProcessingService` — транзакционная фиксация оплаты + регистрация в outbox
- `FiscalizationOutboxScheduler` — воркер с exponential backoff (5с polling)
- `WebKassaClient` — REST-клиент к WebKassa API v2 с session token TTL 24h

### Оценка трудоёмкости

| Этап | Трудоёмкость |
|---|---|
| Flyway миграции + новые entity | S (2-3ч) |
| KaspiPay шлюз + HMAC-валидация | M (4-6ч) |
| WebKassa клиент + фискализация | M (4-6ч) |
| Outbox воркер + retry logic | M (3-5ч) |
| Frontend: QR-код + фискальный бейдж | M (3-5ч) |
| Sandbox-тестирование | M (4-6ч) |

---

## Epic-21 — 1C Data Gateway: Двусторонняя синхронизация с 1С:Предприятие 8.3

> Детальный план: [02-1c-enterprise-bidirectional-sync.md](future/02-1c-enterprise-bidirectional-sync.md)

### Суть задачи

Бухгалтеры работают в 1С:Бухгалтерия для Казахстана (БКТ 3.0). CRM-данные из JF-1C должны автоматически попадать в 1С (реализации, акты), а данные 1С (банковские выписки, сальдо) — обратно в JF-1C.

### Матрица владения данными

| Сущность | Мастер-система | Направление |
|---|---|---|
| Клиенты / Контрагенты | JF-1C CRM | Двустороннее |
| Заказы, счета на оплату | JF-1C CRM | JF-1C -> 1C |
| Реализации / АВР | 1С:Предприятие | 1C -> JF-1C (PDF + статус) |
| Банковские выписки | 1С:Предприятие | 1C -> JF-1C (балансы, транзакции) |
| Номенклатура / Прайс | 1С:Предприятие | 1C -> JF-1C (каталог, read-only) |

### Протокол интеграции

Гибридный подход:
- **Кастомный HTTP-сервис** `JF1C_Integration.cfe` (`/hs/jf1c/v1/`) — неинвазивное расширение 1С для транзакционных операций (проведение реализации, генерация Акта Р-1 в PDF).
- **OData-интерфейс** (`/odata/standard.odata/`) — быстрое чтение НСИ (Номенклатура, Банки).

### Ключевые компоненты

- `sync_1c_mappings` — таблица сопоставления JF-1C ID <-> 1С GUID
- `sync_1c_queue` — очередь обмена (FOR UPDATE SKIP LOCKED, max_retries 10)
- `bank_transactions_1c` — журнал банковских проводок из выписки
- `OneCEnterpriseClient` — Spring Boot 3 RestClient + Resilience4j CircuitBreaker
- Reconciliation Engine — автосверка выписки с инвойсами по регулярным выражениям

### Этапы

1. Недели 1-2: Разработка и тестирование `JF1C_Integration.cfe` на копии базы БКТ 3.0.
2. Недели 3-4: Бэкенд-очередь (`sync_1c_queue`), Flyway V123, CircuitBreaker.
3. Недели 5-6: Пилот на 5 клиентах, сверка проводок по счетам 1210/6010, масштабирование.

---

## Epic-22 — NCALayer + ИС ЭСФ: Электронная подпись и счета-фактуры

> Детальный план: [03-ncalayer-esf-kgd-direct-integration.md](future/03-ncalayer-esf-kgd-direct-integration.md)

### Суть задачи

Юридически значимое подписание документов ЭЦП прямо из браузера через NCALayer и отправка электронных счетов-фактур (ЭСФ) в ИС ЭСФ КГД МФ РК.

### Стек казахстанской криптографии

- НУЦ РК, ключи GOSTKNCA (СТ РК 2.57-2021)
- NCALayer — локальный демон на `wss://127.0.0.1:13579/`, JSON-RPC команда `createCMSSignatureFromBase64`
- Проверка подписи: Kalkan Crypto (BouncyCastle), OCSP `ocsp.pki.gov.kz`, цепочка НУЦ РК
- ИС ЭСФ: SOAP 1.2, Mutual TLS, `esf.gov.kz:8443`

### Ключевые компоненты

- `useNCALayer` — React-хук для WebSocket-подключения к локальному NCALayer
- `KalkanSignatureValidationService` — бэкенд-верификация: математика + OCSP + BIN-матч
- `EsfGateway` — SOAP-клиент для отправки ЭСФ в КГД
- XML-схема ЭСФ v2.0/v3.0 с XML-DSig Enveloped Signature

### Этапы

1. Недели 1-2: Тестовые ЭЦП с pki.gov.kz/test, регистрация на `test3.esf.gov.kz`.
2. Недели 3-4: `useNCALayer` хук в модальных окнах, бэкенд-валидация CMS.
3. Недели 5-6: Сквозной цикл ЭСФ, переход на `esf.gov.kz`.

---

## Оценка совокупного объёма работ

| Горизонт | Задач | Оценка | Когда |
|---|---|---|---|
| P0 Hardening | 12 | ~25-40ч | Первоочередно |
| P2 Roadmap | 20 | ~150+ч | Квартал+ |
| Epic-12 (Kaspi Pay + WebKassa) | ~6 этапов | ~20-30ч | Следующий релиз |
| Epic-21 (1C Data Gateway) | 3 этапа, 6 недель | ~40-60ч | После Billing v2 |
| Epic-22 (NCALayer + ЭСФ) | 3 этапа, 6 недель | ~40-60ч | Параллельно с Epic-21 |

---

## Приоритет запуска

```
Epic-12 (Kaspi Pay + WebKassa Fiscalization)   <-- следующий релиз
  -> Epic-21 (1C Sync)  +  Epic-22 (NCALayer/ESF)   [параллельно]
  -> P2 (Long-term DevOps + Observability)
```

> P0 и P1 закрыты полностью. Домен `zhanfinance.kz` и Staging на Fly.io (P2-1) рекомендуется запустить параллельно с Epic-12.
