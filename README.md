# ZhanFinance (JF-1C)

[![Release](https://img.shields.io/badge/Release-v1.1.0-blue.svg)](https://github.com/MrSgemaSeny/JF-1C/releases)
[![Commits](https://img.shields.io/badge/Commits-670+-informational.svg)](https://github.com/MrSgemaSeny/JF-1C/commits/main)
[![Backend](https://img.shields.io/badge/Backend-Spring_Boot_3.4_%7C_Java_17-orange.svg)](https://spring.io/projects/spring-boot)
[![Frontend](https://img.shields.io/badge/Frontend-React_19_%7C_TypeScript_%7C_Tailwind_v4-61DAFB.svg)](https://react.dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_17_%7C_Flyway_V1--V132-336791.svg)](https://www.postgresql.org)
[![Automated Tests](https://img.shields.io/badge/Tests-696+_Unit%2FIntegration_%2B_9_E2E_Suites-brightgreen.svg)](https://github.com/MrSgemaSeny/JF-1C)
[![Mobile](https://img.shields.io/badge/Mobile-React_Native_0.76_%7C_Expo_52-black.svg)](https://expo.dev)
[![Architecture](https://img.shields.io/badge/Architecture-Modular_Monolith_%2B_FSD-purple.svg)](https://feature-sliced.design)

B2B SaaS-платформа и CRM-система, спроектированная под задачи бухгалтерского консалтинга, налогового сопровождения и финансового аутсорсинга в Республике Казахстан.

Система объединяет распределенный пул задач (Dynamic Task Pool), генерацию первичных бухгалтерских документов (АВР, счета, договоры), биллинг, корпоративную обучающую платформу (LMS), STOMP-чаты в реальном времени, 2FA аутентификацию (TOTP) и лидогенерацию в защищенном контуре с ролевым разграничением прав (6 ролей) и изоляцией данных на уровне строк (Row-Level Security).

---

## Оглавление

1. [Бизнес-Контекст](#1-бизнес-контекст)
2. [Архитектура Системы](#2-архитектура-системы)
3. [Технологический Стек](#3-технологический-стек)
4. [Функциональные Модули](#4-функциональные-модули)
5. [Безопасность, Изоляция Данных и Закрытые Уязвимости](#5-безопасность-изоляция-данных-и-закрытые-уязвимости)
6. [Производительность и Целостность Данных](#6-производительность-и-целостность-данных)
7. [Структура Проекта](#7-структура-проекта)
8. [Локальный Запуск](#8-локальный-запуск)
9. [Автоматизированное Тестирование](#9-автоматизированное-тестирование)
10. [Развертывание и CI/CD](#10-развертывание-и-cicd)
11. [Инженерная Документация](#11-инженерная-документация)

---

## 1. Бизнес-Контекст

Система автоматизирует типовые операции компании, оказывающей бухгалтерские и юридические услуги:
- **Контроль сроков отчетности:** предотвращение штрафов за несвоевременную сдачу налоговых деклараций через детерминированные воронки задач и календарные дедлайны.
- **Распределение операционной нагрузки (Task Pool):** нераспределенные задачи собираются в общем пуле, где сотрудники берут их в работу по своей квалификации; при отклонении результата задача автоматически возвращается в работу (auto-reopen).
- **Документооборот по стандартам РК:** автоматическая сборка актов выполненных работ (АВР), счетов-фактур, договоров на бухгалтерское сопровождение и соглашений о неразглашении (NDA) с рендерингом кириллицы через OpenHTMLtoPDF.
- **Онбординг клиентов и стажеров:** обучающие курсы (LMS) с пошаговыми уроками, отслеживанием прогресса и выдачей сертификатов.
- **Клиентский 1С-хаб:** модуль отображения регламентированных отчетов (ОСВ, сальдо, акты сверки, кассовая книга, склад) в рамках подготовки к интеграции с 1С:Предприятие 8.3 (Epic-21).

---

## 2. Архитектура Системы

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND PRESENTATION LAYER                           │
│  React 19 SPA (Vite) │ Feature-Sliced Design (FSD) │ Tailwind v4 │ i18n (4 Locales)│
│  TanStack Query v5   │ WebSocket STOMP Client      │ @dnd-kit Kanban Board        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / WSS
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY & TRAFFIC CONTROL LAYER                         │
│  ApiRateLimitFilter (Bucket4j) │ Strict Security Headers (CSP, HSTS, Frame)     │
│  JwtAuthenticationFilter       │ SameSite=Strict / Secure Cookie Control        │
│  AuthRateLimitFilter (10/min)  │ CORS (Strict Production Origin Whitelist)       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Context-Path: /api, Controllers: /v1/**
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       SPRING BOOT 3 MODULAR MONOLITH CORE                        │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌────────────┐ │
│ │ CRM & Task Pool   │ │ Document Hub      │ │ Billing & Subscr  │ │ LMS Engine │ │
│ │ (CrmAccessService)│ │ (OpenHtmlToPdf)   │ │ (InvoiceAccess)   │ │ (Courses)  │ │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ └────────────┘ │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌────────────┐ │
│ │ 2FA & Auth Module │ │ Real-Time Chat    │ │ System Health Hub │ │ Audit Log  │ │
│ │ (TOTP RFC 6238)   │ │ (STOMP Broker)    │ │ (Health Probes)   │ │ (Triggers) │ │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ └────────────┘ │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ JDBC (HikariCP Pool) / L2 Cache
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE & CACHING LAYER                             │
│  PostgreSQL 17 Database │ Flyway Schema Migrations (V1–V121) │ Caffeine L2 Cache │
│  DatabaseStorage (BLOB) │ LocalStorage Fallback / Cloudflare R2 │ Append-Only Audit│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Технологический Стек

### Backend
- **Среда выполнения:** Java 17, Spring Boot 3.4+, Spring Framework 6.
- **Безопасность:** Spring Security 6, Stateless JWT в `httpOnly` `SameSite=Strict` `Secure` cookie + Bearer Authorization, 2FA TOTP (RFC 6238) с защитой от перебора (pre-auth attempts), Row-Level Access Services (`CrmAccessService`, `InvoiceAccessService`, `DocumentAccessService`).
- **Хранилище данных:** PostgreSQL 17, Spring Data JPA, Hibernate 6, пул соединений HikariCP.
- **Миграции схемы:** Flyway (неизменяемая цепочка V1–V121 с строгой верификацией контрольных сумм).
- **Сетевой транспорт:** WebSocket, STOMP, SockJS с серверной авторизацией очередей `/topic/chat/{userId}`.
- **Кэш и троттлинг:** Caffeine Cache (per-region TTL), Bucket4j Token Bucket (`ApiRateLimitFilter`, `AuthRateLimitFilter`).
- **Генерация PDF:** Thymeleaf, OpenHTMLtoPDF с валидацией наличия шрифтов и кириллической таблицей символов.
- **Тестирование:** JUnit 5, Mockito, AssertJ, Spring MockMvc, H2 (197 тестов, 100% Pass).

### Frontend
- **Среда сборки:** React 19, TypeScript 5.x, Vite.
- **Архитектура:** Feature-Sliced Design (FSD v2.1) (`shared` -> `entities` -> `features` -> `widgets` -> `pages` -> `app`).
- **Стилизация:** Tailwind CSS v4, CSS Variables, Lucide Icons, шрифт `a_Simpler` в брендинге «ЖАН FINANCE».
- **Клиентское состояние:** TanStack React Query v5 с глобальной обработкой ошибок и синглтон-промисом обновления JWT (`http.ts`).
- **UI-компоненты:** `@dnd-kit` (Kanban Board), SunEditor (Rich Text), Zod (схемы валидации).
- **Интернационализация:** `i18next` (Русский, Казахский, Английский, Китайский) со 100% паритетом ключей (97 тестов).
- **Тестирование:** Vitest, React Testing Library, jsdom (169 тестов, 100% Pass).

### Инфраструктура
- **Backend:** Fly.io (изолированный контейнер, регион `ams`, `zhanfinance.fly.dev`).
- **Frontend:** GitHub Pages (`https://mrsgemaseny.github.io/JF-1C/`, SPA-маршрутизация с fallback через `404.html`).
- **Объектное хранилище:** Cloudflare R2 (бакет `jf1c-documents` для масштабируемого хранения документов).
- **CI/CD:** GitHub Actions (автоматический запуск тестов, проверка TypeScript, линтинг ESLint 9, сборка артефактов, деплой, бэкапы БД, Telegram-оповещения).

---

## 4. Функциональные Модули

### 4.1. CRM & Dynamic Task Pool
- Воронки и этапы с Drag-and-Drop перемещением карточек.
- Единый пул нераспределенных задач с захватом свободными исполнителями.
- Логика Auto-Reopen: возврат задачи в первый рабочий этап при отклонении клиентом.
- Подзадачи, теги, комментарии и фиксация истории действий.

### 4.2. Документооборот (Document Hub)
- Шаблоны документов РК: АВР, счета на оплату, договоры консалтинга, соглашения NDA.
- Двухуровневое хранение: хранение файлов в PostgreSQL (`stored_files` BLOB) с переключением на файловую систему и Cloudflare R2 при масштабировании.
- Валидация загрузок: проверка MIME-типов по белому списку и защита от Path Traversal.

### 4.3. Ролевая модель (6 Ролей)
1. **`ADMIN`** — полный доступ к платформе, финансовым реестрам, аудиту и управлению правами.
2. **`EMPLOYEE`** — ведение закрепленных задач, клиентов и рабочих документов.
3. **`CLIENT`** — личный кабинет: мониторинг статуса учета, согласование актов, скачивание счетов, 1С-отчеты.
4. **`LEARNER`** — обучающийся: доступ к открытым курсам, просмотр уроков, завершение этапов.
5. **`CURATOR`** — куратор: проверка заданий и контроль прогресса обучающихся.
6. **`ADVISOR`** — советник/супервизор: строгий режим наблюдения (Read-Only) за задачами и документами без права модификации.

### 4.4. Обучающая платформа (LMS)
- Иерархия контента: Курс -> Глава -> Урок -> Блоки контента (видео, текст, файлы).
- Отслеживание прогресса: фиксация завершенных уроков по пользователям, выпуск номерных сертификатов.

### 4.5. Лидогенерация и Коммуникации
- Прямой WhatsApp-флоу (+77750584021 / wa.me) с генерацией QR-кодов и готовыми шаблонами обращений.
- STOMP-чаты в реальном времени с сохранением истории переписки и счетчиками непрочитанных сообщений.
- Асинхронные уведомления дежурным администраторам в Telegram о новых заявках и системных событиях.

### 4.6. Клиентский 1С-Хаб (`/client/1c`)
- Пользовательский интерфейс регламентированных финансовых отчетов: ОСВ, сальдо, акты сверки, карточка счета, кассовая книга, складские остатки.
- Текущее состояние: UI-контракт и отображение Empty State в ожидании OData/REST шлюза синхронизации (разработка запланирована в Epic-21).

### 4.7. Telegram-Бот и Outbox-Уведомления (`zhan-finance-tgbot`)
- Автономный микросервис для клиентов: интерактивные команды `/tasks` (активные задачи), `/docs` (документы), `/status` (сводка по учету) и `/unlink`.
- Гарантированная доставка push-уведомлений через транзакционную Outbox-очередь (`telegram_notifications`) с защитой от 429 лимитов (40мс) и фиксацией ошибок.
- Безопасная привязка аккаунта по одноразовым 15-минутным deeplink-токенам и защита внутреннего API через `InternalTokenFilter` (`MessageDigest.isEqual`).

### 4.8. Биллинг и верификация оплат (Billing v1)
- Прямой безналичный расчет для казахстанских B2B-клиентов (ИП/ТОО) через Kaspi и банковский перевод по реквизитам компании (IBAN/БИН).
- Загрузка официальных PDF-чеков клиентами с валидацией MIME-типа (Apache Tika, лимит 10 МБ) и безопасным хранением объектов в Cloudflare R2 (`receipts/{yyyy}/{MM}/{uuid}.pdf`).
- Административная панель модерации: безопасный просмотр документа через 15-минутный Presigned URL, быстрое подтверждение или отклонение с обязательным указанием причины.
- Автоматический жизненный цикл подписок: перевод в статус `ACTIVE` (+30 дней) и закрытие инвойса (`PAID`) при подтверждении; статус `PENDING` при ожидании/отклонении; автоматические напоминания клиентам через Telegram Outbox за 3 дня до истечения срока (`SubscriptionRenewalReminderScheduler`).
- Row-Level Security (`PaymentReceiptAccessService`): строгая изоляция клиентских чеков от чужого доступа и иммутабельность финализированных записей (`CONFIRMED`/`REJECTED`).

---

## 5. Безопасность, Изоляция Данных и Закрытые Уязвимости

В ходе сквозного аудита безопасности, устранения BOLA/IDOR и E2E-верификации были закрыты следующие уязвимости и архитектурные риски:

1. **CSRF & Cookie Hardening:**
   - Для cookie access- и refresh-токенов (`AuthCookieHelper.java`) установлен режим `SameSite=Strict` совместно с `HttpOnly` и `Secure`.
   - Из CORS конфигурации (`CorsConfig.java`, `application-prod.properties`) удален wildcard `https://*.github.io` — разрешен строго точный production origin `https://mrsgemaseny.github.io`.

2. **Разграничение доступа к счетам (Invoice IDOR & Mutation):**
   - Устранена возможность модификации чужих счетов клиентом (`PUT /api/v1/billing/invoices/{id}`): роль `CLIENT` удалена из прав записи в `InvoiceAccessService`.
   - Защищен эндпоинт получения счета `GET /api/v1/billing/invoices/{id}` с валидацией `assertCanRead` (клиент имеет доступ только к собственным счетам, чужие запросы возвращают `403 Forbidden`).

3. **Изоляция роли ADVISOR (Read-Only Enforcement):**
   - В `CrmAccessService.canUpdateTaskDetails` и `TaskController.java` исключена роль `ADVISOR` из списка разрешенных для мутаций задач: консультант переведен в режим строгого чтения.
   - В `DocumentAccessService.canWrite` и `canCreateFor` исключена роль `ADVISOR`: советник не имеет права удалять, редактировать или создавать файлы от имени пользователей.

4. **Реляционная целостность и каскадное удаление в LMS:**
   - Метод `CourseService.deleteCourse` дополнен предварительным удалением связанных записей прогресса (`lessonProgressRepository.deleteByCourseId`), зачислений (`enrollmentRepository.deleteByCourseId`) и сертификатов (`certificateRepository.deleteByCourseId`) перед удалением сущности курса.
   - В `CourseService.createChapter` внедрено явное сохранение `chapterRepository.save(chapter)` перед добавлением в коллекцию курса, предотвращая возврат `id: null`.

5. **Отказоустойчивость генерации PDF:**
   - В `PdfGeneratorService` добавлена предварительная проверка наличия файла шрифта (`/fonts/arial.ttf`) в ресурсах classpath перед вызовом рендерера.

6. **Многоуровневое ограничение частоты запросов (Rate Limiting via Bucket4j):**
   - Лимит на эндпоинтах аутентификации (`/api/v1/auth/**`): 10 запросов в минуту на IP.
   - Лимит на проверку email (`/api/v1/auth/check-email`): 5 запросов в минуту на IP.
   - Лимит на общих бизнес-маршрутах: 100 запросов в минуту с привязкой к `userId` (или IP для неавторизованных).

7. **Неизменяемый журнал аудита (Append-Only Audit):**
   - На уровне схемы PostgreSQL установлены триггеры, запрещающие выполнение операций `UPDATE`, `DELETE` и `TRUNCATE` над таблицами аудита.
   - Персональные и чувствительные данные автоматически маскируются меткой `[PROTECTED]`.

8. **Защитные HTTP-заголовки:**
   - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:;`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 6. Производительность и Целостность Данных

- **Предотвращение N+1 запросов:** связанные сущности CRM, LMS и биллинга подгружаются через `@EntityGraph` и аннотации батчевой выборки `@BatchSize(size = 25)`.
- **Оптимизированные выборки в Chat & LMS:** выборка последних сообщений в `ChatMessageRepository` переведена на оконный SQL (`DISTINCT ON`) вместо N+1 обхода истории; списки курсов в админке инициализируют связанные коллекции за 2 пакетных запроса внутри транзакции.
- **Клиентский Singleton Refresh Promise:** модуль `http.ts` блокирует параллельные запросы обновления токена при конкурентных 401 ошибках, предотвращая гонку сессий и ложное срабатывание Token Reuse Detection.
- **Пагинация по умолчанию:** все списочные выборки (задачи, аудит, чаты, документы) работают через `Pageable` с явной сортировкой по индексам.

---

## 7. Структура Проекта

```text
JF-1C/
├── zhan-finance-backend/           # Spring Boot 3 Java-приложение
│   ├── src/main/java/              # Модульная структура бэкенда
│   │   └── com/example/zhanfinancebackend/
│   │       ├── common/             # Конфигурации, фильтры, GlobalExceptionHandler
│   │       └── modules/            # Бизнес-модули: admin, auth, billing, chat,
│   │                               # courses, crm, documents, landing, notifications
│   ├── src/main/resources/         # Конфигурации, Flyway-миграции (db/migration/V1..V121)
│   └── src/test/java/              # 197 JUnit 5 + Mockito тестов (100% Pass)
├── zhan-finance-frontend/          # React 19 + Vite + TypeScript приложение
│   ├── src/
│   │   ├── app/                    # Корневые провайдеры, маршрутизация, глобальные стили
│   │   ├── pages/                  # Страницы по ролям (Admin, Employee, Client, Advisor, Public)
│   │   ├── widgets/                # UI-блоки (TaskKanbanBoard, Sidebar, Header)
│   │   ├── features/               # Бизнес-функционал (AuthForm, ContactForm, 2FA)
│   │   ├── entities/               # Доменные модели (Task, User, Document, Invoice)
│   │   └── shared/                 # Переиспользуемый UI, клиент API http.ts, i18n
│   └── src/**/*.test.ts(x)         # 169 Vitest + React Testing Library тестов (100% Pass)
├── tests/                          # Сквозные верификационные и E2E сьюты
│   ├── e2e/                        # 9 сценариев полного цикла (CRM, LMS, Chat, Billing, IDOR, UI)
│   ├── artillery/                  # Сценарии нагрузочного тестирования и бенчмарки
│   ├── run-all-e2e.mjs             # Мастер-раннер E2E-тестов
│   └── run-all-tests.mjs           # Сводный раннер E2E + нагрузочных проверок
├── docs/                           # Инженерная документация (ARCHITECTURE, RUNBOOK, SYSTEM_VERIFICATION_REPORT)
├── Epics/                          # Архитектурный план развития по эпикам (Epic-01 .. Epic-21)
├── .agents/                        # Правила агента (AGENTS.md) и журнал контекста (CONTEXT.md)
└── docker-compose.yml              # Локальное окружение (PostgreSQL 17)
```

---

## 8. Локальный Запуск

### Требования к окружению
- **Java:** JDK 17 (Eclipse Temurin / Amazon Corretto).
- **Node.js:** v20.x или v22.x LTS, менеджер пакетов `npm`.
- **PostgreSQL:** v17 (локально или через Docker).

### 1. Клонирование репозитория
```bash
git clone https://github.com/MrSgemaSeny/JF-1C.git
cd JF-1C
```

### 2. Запуск базы данных
```bash
docker compose up db -d
```
База данных запускается на порту `5432` (пользователь `postgres`, схема `zhanfinance`).

### 3. Запуск бэкенда
```bash
cd zhan-finance-backend
./gradlew bootRun
```
- Корневой адрес API: `http://localhost:8080/api`
- OpenAPI/Swagger: `http://localhost:8080/api/swagger-ui.html`

### 4. Запуск фронтенда
```bash
cd ../zhan-finance-frontend
npm install
npm run dev
```
Интерфейс доступен по адресу: `http://localhost:5173/JF-1C/`

---

## 9. Автоматизированное Тестирование

Тестовое покрытие разделено на три уровня: юнит/интеграционные тесты, сквозные E2E-сьюты полного жизненного цикла и нагрузочные профили.

### 9.1. Юнит и интеграционные тесты (696+ тестов)

| Слой | Тест-раннер | Файлов / Классов | Тестов | Результат |
|---|---|---|---|---|
| **Backend Monolith** | JUnit 5 + Mockito + MockMvc | 68 классов | 371 тест | 100% Passed (0 errors) |
| **Web Frontend** | Vitest + React Testing Library | 26 файлов | 214 тестов | 100% Passed (0 errors) |
| **Telegram Bot Service** | JUnit 5 + Mockito | 22 класса | 89 тестов | 100% Passed (0 errors) |
| **Android Mobile** | Vitest + React Native Mocks | 3 файла | 22 теста | 100% Passed (0 errors) |
| **ИТОГО** | | **119 классов / файлов** | **696 тестов** | **100% GREEN** |

```bash
# Запуск тестов бэкенда:
cd zhan-finance-backend
./gradlew test

# Запуск тестов фронтенда:
cd ../zhan-finance-frontend
npm test -- --run
```

### 9.2. Сквозные E2E-сьюты (`tests/e2e/`)

Сквозные тесты выполняются против развернутого контура и проверяют бизнес-процессы от авторизации до физической зачистки созданных сущностей:

1. **`crm-lifecycle-live.mjs` (12/12 PASS):**
   - Получение воронки и стадий -> создание задачи -> чтение деталей -> изменение атрибутов -> перемещение по стадиям -> назначение сотрудника -> публикация комментария -> чтение комментария сотрудником -> проверка истории аудита -> удаление задачи -> валидация 404.
2. **`lms-lifecycle-live.mjs` (11/11 PASS):**
   - Создание курса -> создание главы -> добавление урока -> публикация курса -> видимость в каталоге для студентов -> получение структуры урока -> завершение урока студентом -> сохранение прогресса -> снятие с публикации -> скрытие из каталога -> удаление черновика.
3. **`chat-notifications-live.mjs` (8/8 PASS):**
   - Запрос уведомлений -> массовая отметка прочитанными -> реестр чат-контактов -> отправка сообщения -> проверка счетчика непрочитанных -> чтение истории переписки -> отметка диалога прочитанным -> сброс счетчика в 0.
4. **`documents-search-live.mjs` (9/9 PASS):**
   - Системные шаблоны -> загрузка PDF через multipart/form-data -> появление в общем реестре -> перевод в статус REVIEW -> доступ клиенту -> потоковое скачивание байтов -> полнотекстовый поиск -> удаление -> проверка недоступности.
5. **`billing-invoices-live.mjs` (5/5 PASS):**
   - Выставление счета клиенту со статусом ISSUED -> просмотр списка клиентом -> корректировка суммы и перевод в PAID -> удаление счета -> проверка исключения из реестра.
6. **`api-live.mjs` (34 проверки):**
   - Actuator Health (UP), справочники, публичные формы, проверка строгих заголовков безопасности, fail-closed изоляция защищенных маршрутов (строго 401/403).
7. **`frontend-live.mjs` (16 проверок в Playwright Chromium):**
   - Метатеги, CookieConsent, сохранение настроек в `localStorage`, переключение темы и языков, навигация по публичным страницам, валидация форм.
8. **`authenticated-journeys-live.mjs` (17 проверок в Playwright Chromium):**
   - Реальные пользовательские сессии через браузерный интерфейс для ролей `ADMIN` (8 шагов), `EMPLOYEE` (5 шагов), `CLIENT` (4 шага) с обработкой токен-бакетов.
9. **`idor-live.mjs` (21 проверка):**
   - Валидация матриц разграничения доступа между тенантами и ролями.

```bash
# Запуск всех сквозных E2E-сьютов:
cd tests
node run-all-e2e.mjs
```

### 9.3. Нагрузочное тестирование (Artillery)

Конфигурации в папке `tests/artillery/` проверяют поведение под нагрузкой:
- **`catalog-and-public.yml`**: опрос публичных маршрутов под конкурентным потоком запросов.
- **`frontend-static.yml`**: проверка скорости отдачи статики и SPA через CDN GitHub Pages.
- **`rate-limit-boundary.yml`**: проверка отсечения избыточных запросов фильтром Bucket4j (HTTP 429) без деградации времени ответа базы данных.

---

## 10. Развертывание и CI/CD

- **Frontend (Production):** [https://mrsgemaseny.github.io/JF-1C/](https://mrsgemaseny.github.io/JF-1C/)
- **Backend API (Production):** `https://zhanfinance.fly.dev/api/v1`
- **Пайплайны GitHub Actions (`.github/workflows/`):**
  - `ci.yml` — проверка TypeScript, прогон тестов Vitest, сборка и деплой на GitHub Pages.
  - `deploy-backend.yml` — прогон тестов Gradle, сборка Spring Boot jar, упаковка Docker-образа и деплой на Fly.io.
  - `db-backup.yml` — создание дампов PostgreSQL по расписанию с шифрованием и отправкой отчетов в Telegram.

---

## 11. Инженерная Документация

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — компонентная архитектура, топология потоков данных и ролевые матрицы.
- [`docs/NFR.md`](docs/NFR.md) — спецификация нефункциональных требований (SLA/SLO, бюджеты задержек, Zero-Redis, Multi-Device Refresh Token Family, комплаенс РК).
- [`docs/SYSTEM_VERIFICATION_REPORT.md`](docs/SYSTEM_VERIFICATION_REPORT.md) — детальный отчет по E2E-верификации и архитектурным выводам.
- [`docs/ONBOARDING.md`](docs/ONBOARDING.md) — руководство по настройке рабочего окружения для новых разработчиков.
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — эксплуатационный регламент, мониторинг и процедуры восстановления.
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — стандарты кода, регламент миграций Flyway и правила оформления коммитов.
- [`.agents/CONTEXT.md`](.agents/CONTEXT.md) — текущее операционное состояние проекта и технический бэклог.
- [`docs/future/future_plan.md`](docs/future/future_plan.md) — Hardening Plan (P0/P1/P2) по итогам комплексных аудитов.

