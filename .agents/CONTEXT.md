# Project State & Context -- ZhanFinance (JF-1C)

## Current Phase & Global Goals
- **Active Phase**: Production Quality & Full Test Coverage (Phase 2 & Phase 3 준비)
- **Main Goal**: Transition to Billing & Payments (WebKassa / Kaspi Pay), custom domain (zhanfinance.kz), and Epic-21 (1C Data Gateway).
- **Audit status**: 28 findings total (6 CRITICAL, 9 WARNING, 5 INFO) — 100% resolved and verified.
- **Global Rule**: ALL architectural decisions and context updates must be synchronized with `Brain's Protocol` at `C:\Users\murat\IdeaProjects\new_world\Brain's protocol - second brain`.

## Infrastructure & Test State
- **Backend (Spring Boot 3 / Java 17)**: 100% test pass rate (`./gradlew test`: 363 tests PASS) across all modules (Auth, Admin, CRM, Billing, LMS, Documents, Chat, Notifications, Search, WebSocket ACL, EmailOtp, GoogleAuth, PaymentReceipts). JaCoCo configured for coverage tracking (minimum = 0.52).
- **Frontend (React 19 / Vite / Tailwind v4)**: 100% Vitest test pass rate (25 test files, 198 tests), strict TypeScript verification (`tsc --noEmit`), and clean ESLint 9 flat config (`eslint.config.js`, 0 errors, 0 warnings).
- **Telegram Bot Microservice**: Отдельный микросервис `zhan-finance-tgbot` (`C:\Users\murat\IdeaProjects\zhan-finance-tgbot`, Spring Boot 3 / Java 17, порт 8081, 89 тестов PASS). Общается с монолитом через защищенные внутренние эндпоинты `/api/v1/internal/**` по `X-Internal-Token` (`Role.INTERNAL_BOT`).
- **CI/CD (.github/workflows/ci.yml)**: Continuous quality gate enforcing backend test execution, frontend linting, typechecking, Vitest execution, and GitHub Pages deployment.
- **Storage (Cloudflare R2)**: Presigned URLs (15 мин) для `payment_receipts` с fallback на PostgreSQL `StoredFileRepository`.
- **Auth & Security**: JWT Bearer, refresh token rotation, AES-256 TOTP 2FA, Bucket4j rate limiting, row-level CRM and Billing access controls, Google Account Linking (OAuth 2.0 / GIS), Gmail OTP Protection Flow (Flyway V127).
- **Roles (6)**: ADMIN, EMPLOYEE, CLIENT, LEARNER, CURATOR, ADVISOR (плюс INTERNAL_BOT для бота).

## Key Completed Features & Milestones
1. **Full Automated Test Coverage Across Backend, Frontend & CI/CD**:
   - Comprehensive MockMvc, JUnit 5, Mockito, and Spring Security ACL test coverage for all controllers and domain services.
   - 198 unit and integration tests across frontend entities, widgets, features, contexts, and pages.
   - ESLint 9 flat config with zero warnings and strict TypeScript mode enabled.
   - Dual-track E2E test inventory (`TEST_READY.md`, 202 test specs across 4 tiers) and test infrastructure (`TEST_INFRA.md`).

2. **Branding, Landing & Team Redesign (ЖАН FINANCE)**:
   - Текстовый брендинг «ЖАН FINANCE» на шрифте `a_Simpler`, сквозная замена во всех компонентах и 4 языках.
   - Квадратный векторный SVG и высококачественный растровый PNG (512x512) ассет логотипа (`zhan-finance-logo-new.svg`, `logo.png`, `logo.svg`), вариант `variant="square"` в `BrandLogo` и отображение в свёрнутом сайдбаре.
   - Команда: 1 руководитель + 8 проверенных специалистов, переключатель «Сетка» / «Карусель» и модальное окно деталей.
   - Услуги (Разовые / Аутсорс с SLA), 4 тарифа, FAQ, WhatsApp QR-флоу, выбор роли на странице авторизации.

3. **100% 4-Language i18n & Dictionary Parity (`ru`, `kk`, `en`, `zh`)**:
   - Complete key parity across all 4 locales in `src/shared/i18n/locales/` (96/96 automated parity tests).
   - 100% localized coverage across all authenticated portals, internal dashboards, admin tools, CRM boards, templates, and modals.
   - Zero hardcoded UI strings, strict absence of Cyrillic characters in Chinese locale.
   - Centralized date and currency formatting utilities (`dateFormat.ts`).

4. **1C Client Hub & Report Stubs (`/client/1c`) [ТЕСТОВЫЙ / FRONTEND-ONLY]**:
   - Раздел `/client/1c` и вложенные маршруты — тестовый фронтенд-интерфейс без данных.
   - Полноценный запуск двусторонней синхронизации запланирован в Фазе 3 в рамках Epic-21 (1C Data Gateway).

5. **ZhanFinance Telegram Bot & Outbox Integration (Microservice + Backend) [DONE]**:
   - Flyway миграции V124 (`telegram_links`) и V125 (`telegram_notifications`).
   - Машинная авторизация `Role.INTERNAL_BOT` и фильтр постоянного времени `InternalTokenFilter` (`MessageDigest.isEqual`) для `/v1/internal/**`.
   - Микросервис `zhan-finance-tgbot` на порту 8081 с санитизацией ошибок Telegram.

6. **Global Exception Hardening & Error Sanitization [DONE]**:
   - `GlobalExceptionHandler.java`: перехват `DataIntegrityViolationException` (HTTP 409), `MaxUploadSizeExceededException`, `MethodArgumentTypeMismatchException`.

7. **Google Account Linking & Gmail OTP Registration Protection (Flyway V127) [DONE]**:
   - Gmail OTP подтверждение (60 сек кулдаун), вход в 1 клик через Google, защита от эскалации ролей.

8. **Billing v1: Manual Kaspi / Bank Transfer, Cloudflare R2 Receipts, 4 Tariffs & Full i18n [DONE]**:
   - Flyway миграции V128 (`payment_receipts`, RLS, optimistic locking `version`) и V129 (`subscriptions_status_check`).
   - Безопасное хранилище `DefaultPaymentReceiptStorageService`, RLS проверки, омниканальные уведомления.

9. **Zero Lag & Anti-Race Architecture [DONE]**:
   - Refresh Token Rotation Grace Period (15 сек) по RFC 6819.
   - Пессимистическая блокировка `findByIdForUpdate` (`SELECT ... FOR UPDATE`) для чеков.
   - HikariCP pool tuning: `leak-detection-threshold=10000` (10с) и `connection-timeout=5000`.
   - Атомарная идемпотентность (`IdempotencyService`): потокобезопасный `putIfAbsent`, кэширование результатов при сетевых ретраях.
   - React Query network optimization: `staleTime: 30s` и `gcTime: 5m`, Optimistic UI в CRM Kanban.

10. **Targeted Security & Architecture Remediation (11 Items Audit) [DONE]**:
    - Fail-fast production check для `INTERNAL_BOT_TOKEN` в `InternalTokenFilter` и `application-prod.properties`.
    - AES-256-GCM JPA Converter (`TotpSecretConverter`) для `totpSecret` с Flyway V131 (`VARCHAR(255)`).
    - Ликвидирован deadlock в `TwoFactorController` (`@PreAuthorize("isAuthenticated()")` на `/disable`).
    - Проверка `isEnabled` в `JwtAuthenticationFilter` (блокировка деактивированных пользователей).
    - `cleartext: false` в `capacitor.config.ts`.
    - 0 нарушений FSD в слое `src/shared` (декуплированы `searchApi`, `LanguageSwitcher`, `Badge`).
    - Создан `src/shared/api/generated-schema.d.ts`.
    - JaCoCo threshold повышен до 52% (0.52).
    - 363 backend теста (100% PASS), 198 frontend тестов (100% PASS), `tsc --noEmit` — 0 ошибок.

11. **2FA Hardening & Pre-Auth Setup Flow [DONE]**:
    - Разграничен `AuthResponse`: `twoFactorEnabled = false` сигнализирует необходимость настройки (`requires2FASetup`), `true` — ввод кода (`requires2FA`).
    - Закрыты обходы 2FA через `/setup-preauth` и Google OAuth для роли `ADMIN`.
    - Добавлен лимит попыток ввода кода при настройке (5 попыток), аннулирование всех старых refresh-сессий при включении.
    - Реализован `TotpSetupForm.tsx` с QR-кодом, копированием секрета и полной поддержкой 4 локалей (`ru`, `kk`, `en`, `zh`).

## NEXT: Hardening Plan (P2 Roadmap)
Staging, Cursor pagination, Audit partitioning, SBOM, Dependabot, Trivy, ADR, Semver, Document versioning, Soft delete, PII inventory, Log sanitization, Backward-compatible migrations, Preview envs, DR plan, Invoice line model, File upload hardening, PDF limits, CORS audit, Observability stack.
