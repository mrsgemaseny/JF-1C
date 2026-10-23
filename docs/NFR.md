# Non-Functional Requirements (NFR) Specification — ZhanFinance (JF-1C)

**Document Version**: 1.0.0  
**Effective Date**: 2026-10-23  
**Status**: Approved & Enforced  
**Target System**: JF-1C Monolith Backend (Spring Boot 3 / Java 17), Web Frontend (React 19 / FSD), Mobile Monolith (`zhan-finance-android` Expo SDK 52), Telegram Microservice (`zhan-finance-tgbot`).

---

## 1. Executive Summary & Purpose

Настоящий документ определяет обязательные нефункциональные требования (Non-Functional Requirements, NFR) к архитектуре, производительности, безопасности, масштабируемости, надежности и соблюдению регуляторных стандартов B2B SaaS CRM/бухгалтерской платформы ZhanFinance (JF-1C). 

Все архитектурные решения, изменения в кодовой базе и новые модули обязаны соответствовать приведенным ниже SLA, SLO и инвариантам безопасности.

---

## 2. Performance & Latency Budgets (Производительность)

### 2.1. API Response Latency (SLO)
- **Read Operations (Cached / L1 Caffeine)**: p95 < 15ms, p99 < 50ms.
- **CRUD Operations (Standard DB Read/Write)**: p95 < 120ms, p99 < 300ms.
- **Heavy Reporting & Analytics Aggregations**: p95 < 400ms, p99 < 800ms.
- **PDF Generation (OpenHTMLtoPDF + Thymeleaf)**: < 750ms при параллельности до 8 одновременных запросов.
- **WebSocket STOMP Message Delivery**: p95 < 35ms (end-to-end от отправки до доставки подписчику).

### 2.2. Database & Query Performance
- **Zero N+1 Policy**: Категорически запрещены N+1 запросы в JPA/Hibernate. Все связи подгружаются строго через `FetchType.LAZY` в сочетании с явными `@EntityGraph` или `JOIN FETCH` в JPQL.
- **Query Execution Budget**: Любой одиночный SQL-запрос обязан выполняться за время < 30ms. Запросы длительнее 100ms считаются дефектами производительности.
- **Index Coverage**: Все внешние ключи (`client_id`, `pipeline_id`, `stage_id`, `assigned_to_id`), статусы воронок, даты создания и поисковые поля обязаны иметь индексы B-Tree.

### 2.3. Client & Mobile Runtime Budgets
- **Web First Contentful Paint (FCP)**: < 1.0s на стандартном 4G соединении.
- **Web Largest Contentful Paint (LCP)**: < 1.8s.
- **Mobile Cold Start (`zhan-finance-android`)**: < 1.5s до интерактивного экрана (TTI).
- **Mobile Warm Start**: < 350ms.
- **Bundle Size**: Web JS bundle gzip < 280KB для начального чанка; Mobile APK release size < 35MB.

---

## 3. Security, Authentication & Zero Trust (Безопасность)

### 3.1. Authentication Architecture
- **Stateless Access JWT**: Время жизни токена — строго 15 минут. Токен содержит claims роли, ID пользователя и subject.
- **Refresh Token Family & Rotation (RFC 6819)**:
  - Долгоживущие refresh-токены (срок действия 30 дней) хранятся в БД с ротацией при каждом обновлении.
  - Поддерживается семейство токенов (Token Family) с автоматической детекцией компрометации (Reuse Detection).
  - Лимит одновременных активных сессий на аккаунт: `MAX_ACTIVE_SESSIONS_PER_USER = 5` (поддержка параллельной работы Web + Android без инвалидации валидных сессий). При превышении инвалидируется только самая старая сессия.
- **Двухфакторная аутентификация (2FA TOTP)**: Обязательна для роли `ADMIN`. Секреты TOTP шифруются в БД.

### 3.2. Authorization & Row-Level Security
- **Role-Based Access Control (RBAC)**: 6 системных ролей (`ADMIN`, `EMPLOYEE`, `CLIENT`, `LEARNER`, `CURATOR`, `ADVISOR`) + служебная `INTERNAL_BOT`.
- **Row-Level Security (RLS)**: Реализована на уровне сервисного слоя через `CrmAccessService`. Запрещен доступ к задачам, инвойсам, документам или клиентам без явной верификации владения/назначения или прав администратора.
- **WebSocket Access Control**: Подписка на каналы `/topic/chat/{userId}` валидируется по JWT Principal. Отправка сообщений проверяется на соответствие отправителя текущему контексту безопасности.

### 3.3. Abuse Prevention & Rate Limiting
- **Auth Rate Limiting (`AuthRateLimitFilter`)**: Защита от brute-force атак на `/api/v1/auth/**` (максимум 5 неудачных попыток в минуту по IP/логину).
- **API Rate Limiting (`ApiRateLimitFilter`)**: Защита эндпоинтов от перегрузки (максимум 100 запросов в минуту на авторизованного пользователя).
- **Memory-First / Zero-Redis**: Реализовано с помощью in-memory структур Bucket4j с очисткой неактивных бакетов, исключая зависимость от сторонней Redis-инфраструктуры.

---

## 4. Reliability, Availability & Fault Tolerance (Надежность)

### 4.1. Availability & Recovery Objectives
- **Target Availability (Uptime)**: 99.9% в рабочие часы (08:00–20:00 UTC+5), 99.5% в нерабочее время.
- **Recovery Point Objective (RPO)**: <= 24 часа (ежесуточные инкрементальные и полные дампы БД).
- **Recovery Time Objective (RTO)**: <= 30 минут для полного восстановления из дампа.
- **Automated Healthchecks**: Liveness и Readiness пробы через `/actuator/health` с автоперезапуском упавших инстансов платформой Fly.io.

### 4.2. Concurrency & Idempotency
- **Optimistic Locking**: Все критичные сущности (`Task`, `Invoice`, `Client`) снабжены версионным полем `@Version` для исключения перезаписи данных при параллельном редактировании.
- **Idempotency Service**: Все мутации списания/создания счетов и офлайн-синхронизации поддерживают заголовок `Idempotency-Key` с хранением хэша результата операции в течение 24 часов.
- **Telegram Outbox Pattern**: Отправка оповещений через Telegram-бота выполняется асинхронно через транзакционный Outbox после коммита транзакции (`TransactionPhase.AFTER_COMMIT`), гарантируя отсутствие блокировок бизнес-транзакций при задержках Telegram API.

### 4.3. Offline-First Resilience (Mobile)
- **Local MMKV Storage**: Кэш состояния и очередь мутаций хранятся в C++ MMKV хранилище.
- **Single-Flight Refresh Mutex**: При пропадании интернета или истечении токена запросы накапливаются в очереди и повторяются после восстановления сессии без сброса авторизации и без выбрасывания пользователя на экран логина.

---

## 5. Scalability & Resource Constraints (Масштабируемость)

### 5.1. Resource Envelope
- **Backend Container Budget**: Максимальное потребление памяти монолитом Spring Boot — 512MB RAM (флаги JVM: `-XX:+UseG1GC -XX:MaxRAMPercentage=75.0`).
- **Database Connection Pool**: HikariCP сконфигурирован на 10-20 соединений на инстанс с жестким тайм-аутом обнаружения утечек (`leak-detection-threshold: 2000ms`).

### 5.2. Stateless Application Tier
- Все экземпляры бэкенда строго stateless. Сессионное состояние не сохраняется в памяти приложения, что позволяет выполнять мгновенное горизонтальное масштабирование (`fly scale count N`).

---

## 6. Observability & Auditability (Наблюдаемость)

### 6.1. Logging & Tracing
- **Correlation ID (requestId)**: Каждый HTTP-запрос помечается уникальным `X-Request-Id`, который пробрасывается в MDC (Mapped Diagnostic Context) логирования, передается во все исходящие логи и возвращается в заголовках ответа клиенту.
- **Log Sanitization**: Категорически запрещено логирование чувствительных данных (пароли, JWT-токены, ИИН/БИН, номера кредитных карт, TOTP-секреты).

### 6.2. Audit Trail
- Все действия с финансовыми документами, сменой этапов воронок задач, удалением данных или изменением ролей пользователей логируются в таблице `audit_logs` с фиксацией `user_id`, `client_ip`, `user_agent`, `entity_type`, `entity_id` и diff изменений.

---

## 7. Kazakhstan Localization & Regulatory Compliance

- **Валюта**: Все финансовые расчеты ведутся строго в национальной валюте KZT (тенге) с использованием типа `BigDecimal` на бэкенде и `NUMERIC(15,2)` в PostgreSQL.
- **Идентификаторы**: Обязательная валидация контрольного разряда для ИИН (физлица) и БИН (юрлица) Республики Казахстан (12 цифр).
- **Телефонный формат**: Строгая нормализация к стандарту E.164 (`+7 7XX XXX XX XX`).
- **Мультиязычность (i18n)**: 100% паритет интерфейса и локализации системных уведомлений на 4 языках:
  - Казахский (`kk`)
  - Русский (`ru`)
  - Английский (`en`)
  - Китайский (`zh`)

---

## 8. Verification & Compliance Checklist

Любой релиз или PR в ветку `main` обязан проходить следующие автоматические барьеры:
1. `Backend Unit/Integration Tests`: 100% pass (`./gradlew check`).
2. `Frontend Web Tests`: 100% pass (`vitest run`).
3. `Mobile Unit Tests`: 100% pass (`vitest run` в `zhan-finance-android`).
4. `TypeScript Strict Check`: 0 ошибок компиляции (`tsc --noEmit`).
5. `Flyway Migration Immutability`: Отсутствие изменений в примененных миграциях (`V1..V108+`).
