# Архитектура JF-1C (ZhanFinance)

Документ описывает верхнеуровневую архитектуру, модули, концепцию безопасности и организацию данных в платформе JF-1C (SaaS CRM / бухгалтерская система).

---

## 1. Стек технологий

* **Backend**: Spring Boot 3.4+ (Java 17), PostgreSQL 17, Flyway (V1–V132), Caffeine Cache, Hibernate/JPA, Gradle.
* **Frontend**: React 19, Vite, TypeScript, Tailwind v4, Feature-Sliced Design (FSD).
* **Mobile (Android)**: React Native 0.76+ / Expo SDK 52 (New Architecture: Hermes + JSI + Fabric), FSD 2.1, NativeWind v4, Android Keystore (`expo-secure-store`), MMKV Offline-First Cache, Single-Flight Refresh Mutex.
* **Telegram Bot Microservice**: Отдельный сервис `zhan-finance-tgbot` (Spring Boot 3, Java 17, порт 8081), взаимодействие с монолитом по защищенному `X-Internal-Token` (`Role.INTERNAL_BOT`).
* **Безопасность**: Spring Security 6, Multi-Device Refresh Token Family (RFC 6819, лимит 5 активных сессий), Row-Level Access Control (`CrmAccessService`), 2FA (TOTP) для админов и эдвайзеров.
* **Обсервабилити**: Micrometer OTLP Metrics, UptimeRobot, Prometheus, сквозной `X-Request-Id` (MDC).
* **Коммуникации**: STOMP / SockJS over WebSocket (авторизованные топики `/topic/chat/{userId}`).
* **Инфраструктура**: Fly.io (Backend API), GitHub Pages (Frontend SPA), GitHub Actions (CI/CD, Nightly DB Backups в Telegram).

---

## 2. Архитектура бэкенда

Бэкенд организован по модульному принципу внутри пакета `com.example.zhanfinancebackend.modules`.
Все API запросы роутятся через `context-path=/api` и версионированы как `/v1/**` (итоговые пути `/api/v1/...`).

### Основные модули:
1. **auth**: Логин, регистрация (со статусами PENDING/APPROVED/REJECTED), генерация JWT, ротация refresh-токенов, 2FA, rate-limiting фильтры.
2. **crm**: Задачи (`Task`), стадии (`Stage`), пайплайны (`Pipeline`), клиенты (`Client`). Единый Task Pool с логикой автоматического переоткрытия.
3. **billing**: Инвойсы (`Invoice`), подписки (`Subscription`), финансовый учет. В рамках Billing v1 — ручная верификация платежей (`PaymentReceipt`), хранение чеков в Cloudflare R2 по 15-минутным presigned URL, статус `PENDING` для подписок и Telegram Outbox оповещения.
4. **lms**: Обучающая платформа (`Course` -> `Chapter` -> `Lesson` -> `LessonBlock`), квизы, выдача сертификатов.
5. **documents**: Генерация официальных документов (PDF через Thymeleaf + OpenHTMLtoPDF), строгая фильтрация файлов по MIME/расширениям.
6. **chat**: Чат в реальном времени через WebSocket.
7. **audit & notifications**: Журналирование действий (с защитой от изменения/удаления) и отправка email/telegram уведомлений.

---

## 3. Ролевая модель и безопасность

Система поддерживает 6 ролей:
* `ADMIN`: Полный доступ ко всем модулям и административным функциям.
* `EMPLOYEE`: Сотрудник компании. Имеет доступ к назначенным задачам, клиентам, документам и чатам.
* `ADVISOR`: Советник/супервизор. Имеет сквозной режим наблюдения (строгий Read-Only) за задачами, документами, клиентами и сводной аналитикой компании без прав на изменение или удаление сущностей.
* `CLIENT`: Клиент бухгалтерской фирмы. Доступ строго ограничен своими задачами, документами и счетами (без прав создания или модификации счетов).
* `LEARNER`: Ученик LMS-платформы. Доступ к открытым курсам и структуре уроков.
* `CURATOR`: Куратор курсов. Доступ к проверке заданий и прогрессу учеников.

### Row-Level Access Control и Защита от IDOR
Безопасность строится на эшелонированной защите (Defense-in-Depth):
1. **`CrmAccessService`**: проверяет владение задачами и клиентами при любых единичных и пакетных операциях. Роль `ADVISOR` изолирована от мутаций (`canUpdateTaskDetails = false`).
2. **`InvoiceAccessService`**: разграничивает финансовые реестры. Клиент (`CLIENT`) имеет доступ только на чтение собственных счетов через `assertCanRead`; создание и редактирование (`canWrite`, `canCreateFor`) разрешено строго ролям `ADMIN` и `EMPLOYEE`.
3. **`PaymentReceiptAccessService`**: разграничивает реестр чеков оплат и доступ к объектам в R2. Клиент имеет доступ только к собственным чекам; подтверждение, отклонение и модерация разрешены строго роли `ADMIN`. Финализированные чеки (`CONFIRMED`/`REJECTED`) иммутабельны.
4. **`DocumentAccessService`**: разграничивает файловое хранилище. Советник (`ADVISOR`) имеет доступ на чтение и скачивание документов без прав на удаление или создание файлов от имени пользователей.
5. **Реляционная целостность (PostgreSQL)**: каскадная очистка зависимых записей прогресса, зачислений и сертификатов в LMS перед удалением сущности курса, предотвращающая падения по внешним ключам.

---

## 4. База данных и миграции Flyway

* **Правило неизменяемости миграций**: Все миграции в `src/main/resources/db/migration/` (от `V1` до `V132`) являются строго неизменяемыми. Изменение примененных скриптов ломает чексуммы и деплой.
* **Инициализация данных**: Заполнение первичных данных (сидинг) выполняется исключительно через событие `@EventListener(ApplicationReadyEvent.class)`. Использование `@PostConstruct` для операций с БД строго запрещено.
* **Защита аудита**: В PostgreSQL созданы триггеры, запрещающие выполнение `UPDATE` и `DELETE` запросов на таблицы аудита.

---

## 5. Архитектура фронтенда (FSD)

Код фронтенда организован по методологии Feature-Sliced Design:
```text
src/
├── app/          # Инициализация приложения, провайдеры, роутер
├── pages/        # Страницы приложения (LoginPage, DashboardPage, AdminEmployeesPage...)
├── widgets/      # Крупные самостоятельные блоки UI (TaskKanbanBoard, DocumentViewer...)
├── features/     # Пользовательские сценарии (contact-form, 2fa-setup, auth...)
├── entities/     # Бизнес-сущности (task, client, user, course...)
└── shared/       # Переиспользуемый код (api/http, ui, lib, i18n...)
```

### Запросы и состояние:
* Все сетевые запросы используют единую обертку `apiRequest` в `@/shared/api/http`.
* Состояние данных управляется через TanStack React Query с жесткой структурой ключей `['tasks', 'list', filter]`.

---

## 6. Архитектура автоматизированного тестирования

Стратегия верификации JF-1C разделена на три взаимодополняющих эшелона:
1. **Модульные и интеграционные тесты (696+ тестов)**:
   - Backend Monolith (JUnit 5 + Mockito + MockMvc): 371 тест в 68 классах, проверяющих контроллеры, сервисы, Multi-Device Refresh Token Families, Device Push Tokens (V132), триггеры аудита и защиту от IDOR.
   - Web Frontend (Vitest + React Testing Library): 214 тестов в 26 файлах, проверяющих рендеринг FSD-виджетов, формы входа, сброса паролей, переключение локалей (100% паритет 4 языков) и ограничения прав доступа.
   - Telegram Bot Service (JUnit 5 + Mockito): 89 тестов в 22 классах, верифицирующих сценарии взаимодействия бота с ядром.
   - Android Mobile (Vitest + React Native Mocks): 22 теста в 3 файлах, проверяющих HTTP Single-Flight Mutex, DTO-контракты, Offline Queue и паритет локализации.
2. **Сквозные E2E-сьюты полного жизненного цикла (`tests/e2e/`)**:
   - `crm-lifecycle-live.mjs`: проверка воронки, задач, назначения, аудита и зачистки.
   - `lms-lifecycle-live.mjs`: создание и публикация курсов, прохождение уроков, сохранение прогресса.
   - `chat-notifications-live.mjs`: отправка сообщений, счетчики непрочитанных, реестры уведомлений.
   - `documents-search-live.mjs`: генерация, загрузка файлов, согласование, полнотекстовый поиск.
   - `billing-invoices-live.mjs`: выставление счетов, реестр оплат, перевод статусов, изоляция клиента.
   - `api-live.mjs` & `idor-live.mjs`: проверка 34 API-контрактов, HTTP-заголовков безопасности и разграничения доступа.
   - `frontend-live.mjs` & `authenticated-journeys-live.mjs`: браузерные пользовательские сценарии (Playwright Chromium) для ролей ADMIN, EMPLOYEE, CLIENT.
3. **Нагрузочные профили (Artillery)**:
   - Публичные эндпоинты, CDN статики фронтенда и верификация граничных условий Bucket4j rate limiting.
