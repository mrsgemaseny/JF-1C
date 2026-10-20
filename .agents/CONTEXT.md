# Project State & Context -- ZhanFinance (JF-1C)

## Current Phase & Global Goals
- **Active Phase**: Exhaustive System Audit & Hardening — 100% Closure of All Vulnerabilities and Architectural Defects
- **Main Goal**: Transition to Billing & Payments (WebKassa / Kaspi Pay), custom domain (zhanfinance.kz), and Epic-21 (1C Data Gateway).
- **Audit status**: 100% of findings across Security, Access Control, Concurrency, Database, FSD, and i18n resolved and verified.
- **Global Rule**: ALL architectural decisions and context updates must be synchronized with `Brain's Protocol` at `C:\Users\murat\IdeaProjects\new_world\Brain's protocol - second brain`.

## Infrastructure & Test State
- **Backend Monolith (Spring Boot 3 / Java 17)**: 100% test pass rate (`./gradlew check`: 369 tests PASS) across all modules (Auth, Admin, CRM, Billing, LMS, Documents, Chat, Notifications, Search, WebSocket ACL, EmailOtp, GoogleAuth, PaymentReceipts). JaCoCo verified.
- **Telegram Bot Microservice**: `zhan-finance-tgbot` (`C:\Users\murat\IdeaProjects\zhan-finance-tgbot`, Spring Boot 3 / Java 17, порт 8081). 100% test pass rate (`./gradlew check`: 89 tests PASS), JaCoCo verified. Communicates with monolith via `/api/v1/internal/**` with `X-Internal-Token` (`Role.INTERNAL_BOT`).
- **Frontend (React 19 / Vite / Tailwind v4)**: 100% Vitest test pass rate (26 test files, 214 tests PASS), strict TypeScript verification (`npm run typecheck`: 0 errors), and clean ESLint 9 flat config (`npm run lint`: 0 errors, 0 warnings).
- **CI/CD (.github/workflows/ci.yml & deploy-backend.yml)**: Continuous quality gate enforcing `./gradlew check`, frontend linting, typechecking, and Vitest execution.
- **Auth & Security**: JWT Bearer, refresh token rotation with pessimistic locking (`findByTokenForUpdate`), AES-256-GCM TOTP 2FA with key rotation fallback, Apache Tika MIME validation, HTML escaping in emails, rate limiting, and row-level CRM access controls.
- **Roles (6)**: ADMIN, EMPLOYEE, CLIENT, LEARNER, CURATOR, ADVISOR (plus INTERNAL_BOT).

## Key Completed Features & Milestones
1. **Exhaustive System Audit Remediation (Zero Trust, IDOR, Concurrency, FSD, i18n)**:
   - **Access Control & IDOR**: Protected `SubscriptionController` mutations to `ADMIN`, secured `PaymentReceiptController.downloadFallbackFile` via `loadReceiptFileByKey` and RLS `accessService.assertCanRead`, added employee-to-client assignment checks in `DocumentAccessService`, restricted `ADVISOR` to strict Read-Only CRM access.
   - **Concurrency & Locking**: Enforced `findByIdForUpdate` without unsafe fallbacks in billing moderation, pessimistic locking on refresh token rotation, isolated cache entries per user in `IdempotencyService`.
   - **Security Hardening**: AES-256 TOTP converter with key rotation fallback (`AEADBadTagException`), Apache Tika strict MIME validation for avatars/files, `HtmlUtils.htmlEscape` in email templates, S3/R2 client timeouts (`15s` call, `10s` attempt) with `@PreDestroy`.
   - **Telegram Microservice**: Fixed `Dockerfile` UTF-8 encoding and entrypoint, set `web-application-type: none`, configured JaCoCo coverage (0.70 minimum).
   - **Frontend Architecture & FSD**: Moved `TaskDetailsModal` to `@/widgets/task-details-modal`, unified `ApiError` handling with retry filters, secured login/register from Open Redirect, safe STOMP WebSocket teardown handling in-flight handshakes and visibility changes.
   - **100% 4-Language i18n Parity**: Synchronized `ru`, `kk`, `en`, `zh` for labels, otp, settings google/telegram, billing stats. Zero hardcoded UI strings, zero Cyrillic characters in Chinese translations.

2. **Full Automated Test Coverage, Chunk Recovery & N+1 Optimization**:
   - Monolith Backend: 370 tests PASS (`./gradlew check`). All N+1 hotspots eliminated: `findClientsWithoutProfile`, `@EntityGraph` on invoices, `default_batch_fetch_size=50`, `SUBSELECT` and `@BatchSize` across collections.
   - Telegram Bot: 89 tests PASS (`./gradlew check`).
   - Frontend: 214 tests PASS (26 files), `npm run typecheck` 0 errors, `npm run lint` 0 warnings. 3-tier Vite chunk load recovery with anti-loop guard (`vite:preloadError`, `lazyWithRetry`, `ErrorBoundary`).

## NEXT: Roadmap
- Billing & Payments (WebKassa / Kaspi Pay integration).
- Custom domain setup (zhanfinance.kz).
- Staging environment on Fly.io.
- Epic-20 (AI Assistant).
- Epic-21 (1C Data Gateway & Fiscal Hub).
