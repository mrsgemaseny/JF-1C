# Project State & Context -- ZhanFinance (JF-1C)

## Current Phase & Global Goals
- **Active Phase**: Epic-22 (`zhan-finance-android` Native Mobile Monolith) & Production Hardening Complete
- **Main Goal**: Transition to Billing & Payments (WebKassa / Kaspi Pay), custom domain (zhanfinance.kz), and Epic-21 (1C Data Gateway).
- **Audit status**: 100% of findings across Security, Access Control, Concurrency, Database, FSD, Mobile Auth, and i18n resolved and verified.
- **Global Rule**: ALL architectural decisions and context updates must be synchronized with `Brain's Protocol` at `C:\Users\murat\IdeaProjects\new_world\Brain's protocol - second brain`.

## Infrastructure & Test State
- **Backend Monolith (Spring Boot / Java 17)**: 100% test pass rate (`./gradlew check`: 371 tests PASS) across all modules (Auth, Multi-Device Refresh Token Families, Device Push Tokens V132, Admin, CRM, Billing, LMS, Documents, Chat, Notifications, Search, WebSocket ACL, EmailOtp, GoogleAuth, PaymentReceipts). JaCoCo verified.
- **Android Mobile Monolith (`zhan-finance-android`)**: React Native 0.76+ / Expo SDK 52 (New Architecture: Hermes + JSI + Fabric), FSD 2.1, NativeWind v4 (`DESIGN.md` tokens), Android Keystore (`expo-secure-store`), C++ MMKV Offline-First cache, Single-Flight Refresh Mutex, Offline Mutation Queue with `Idempotency-Key`, Lifecycle-aware STOMP WebSocket. 100% Vitest pass rate (22 tests PASS across HTTP Mutex, DTO contracts, Offline Queue, and 4-language i18n parity), strict TypeScript 0 errors. Full DTO alignment with backend, task creation & stage transitions, Google OAuth via Expo proxy, and Safe Area insets support.
- **Telegram Bot Microservice**: `zhan-finance-tgbot` (`C:\Users\murat\IdeaProjects\zhan-finance-tgbot`, Spring Boot 3 / Java 17, порт 8081). 100% test pass rate (`./gradlew check`: 89 tests PASS), JaCoCo verified.
- **Web Frontend (React 19 / Vite / Tailwind v4)**: 100% Vitest test pass rate (25 test files, 198 tests PASS), strict TypeScript verification (`npx tsc -b`: 0 errors), and clean ESLint 9 flat config (`npm run lint`: 0 errors, 0 warnings).
- **Roles (6)**: ADMIN, EMPLOYEE, CLIENT, LEARNER, CURATOR, ADVISOR (plus INTERNAL_BOT).

## Key Completed Features & Milestones
1. **Epic-22: Monolithic Android Native Application (`zhan-finance-android`) & Multi-Device Auth**:
   - **Multi-Device Sessions (`RefreshTokenService`)**: Replaced destructive `deleteAllByUserExceptId` on login with concurrent Token Family management (`MAX_ACTIVE_SESSIONS_PER_USER = 5`), allowing simultaneous Web + Android sessions while revoking only the oldest excess session.
   - **Mobile Token Transport (`AuthCookieHelper`, `AuthController`, `CorsConfig`)**: Added `X-Refresh-Token` response header delivery and body-based `POST /api/v1/auth/logout` token revocation, plus fixed `AuthService.refresh` to return the rotated token directly.
   - **Device Push Tokens (`V132__create_user_device_tokens.sql`, `DeviceTokenController`)**: Added `/api/v1/notifications/devices` endpoints for mobile push token registration/unregistration.
   - **Resilient Mobile Core (`zhan-finance-android`)**: Implemented Single-Flight Token Refresh Mutex (preserving Keystore credentials during offline drops), MMKV Offline-First cache persister, offline mutation queue with `Idempotency-Key`, lifecycle-aware STOMP client, biometric lock (`expo-local-authentication`), native file sharing (`expo-sharing`), and role-adaptive screens (`Overview`, `Tasks/Pool`, `Chat`, `Billing`, `Documents`, `Profile`).

2. **Exhaustive System Audit Remediation & Full Automated Test Coverage**:
   - Monolith Backend: 371 tests PASS (`./gradlew check`). All N+1 hotspots eliminated.
   - Telegram Bot: 89 tests PASS (`./gradlew check`).
   - Web Frontend: 198 tests PASS (25 files), `npx tsc -b` 0 errors, `npm run lint` 0 warnings.
   - Android Mobile: 7 tests PASS (2 files).

## NEXT: Roadmap
- Billing & Payments (WebKassa / Kaspi Pay integration).
- Custom domain setup (zhanfinance.kz).
- Staging environment on Fly.io.
- Epic-20 (AI Assistant) & Epic-21 (1C Data Gateway & Fiscal Hub).
