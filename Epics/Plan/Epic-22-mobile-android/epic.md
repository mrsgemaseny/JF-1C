# Epic-22: Android Native Mobile Application (`zhan-finance-android`)

## Мета

| Поле         | Значение                                                    |
|--------------|-------------------------------------------------------------|
| **Домен**    | Mobile / Cross                                              |
| **Роли**     | ADMIN, EMPLOYEE, CLIENT, ADVISOR, CURATOR, LEARNER          |
| **Статус**   | Done                                                        |
| **Миграции** | V132                                                        |
| **Зависит от** | Epic-01, Epic-02, Epic-03, Epic-05, Epic-06, Epic-07, Epic-09 |
| **Блокирует**  | ничего                                                      |

---

## Зачем этот эпик

Веб-обертка внутри Android System WebView подвержена принудительному сбросу сессии из-за блокировки сторонних `HttpOnly` кук, зависанию фоновых WebSocket-соединений в режиме энергосбережения (Doze Mode) и отсутствию работы без сети. Эпик вводит монолитное нативное Android-приложение `zhan-finance-android` на базе React Native New Architecture (Hermes + JSI + Fabric) с хранением сессии в аппаратном Android Keystore, мгновенным Offline-First кэшем (MMKV), очередью офлайн-мутаций с `Idempotency-Key` и поддержкой одновременных мульти-сессий (ПК + Телефон) на бэкенде.

---

## Пользовательские истории

| ID       | Роль      | Хочу                                      | Чтобы                                              | Статус |
|----------|-----------|-------------------------------------------|----------------------------------------------------|--------|
| US-22.1  | ALL       | быть авторизованным одновременно на ПК и в Android-приложении без сброса сессии при обрыве связи | работать с телефона и компьютера параллельно без повторного ввода пароля и 2FA | Done |
| US-22.2  | ALL       | защищать вход в мобильное приложение биометрией (отпечаток пальца / лицо) и хранить токен в Android Keystore | исключить несанкционированный доступ к финансовым данным при передаче телефона | Done |
| US-22.3  | ALL       | просматривать задачи, счета, документы и отправлять сообщения даже при нестабильном интернете | приложение открывалось мгновенно из кэша MMKV и автоматически досылало действия при появлении сети | Done |
| US-22.4  | EMPLOYEE, ADMIN | просматривать свободный пул задач (Task Pool) и захватывать задачи с тактильным откликом | оперативно брать клиентские задачи в работу с мобильного устройства | Done |
| US-22.5  | CLIENT    | прикреплять чеки оплаты к счетам и делиться PDF-документами в Kaspi / WhatsApp через системное меню Android | оплачивать счета и пересылать акты в 2 нажатия | Done |
| US-22.6  | ALL       | переключать язык интерфейса между 4 языками (RU / KK / EN / ZH) | работать на родном языке с полной синхронизацией локали API | Done |

---

## Технические решения

- **Multi-Device Token Families (`RefreshTokenService`)**: Лимит до 5 параллельных активных семейств токенов на пользователя вместо удаления всех токенов при новом входе; вытеснение только самой старой сессии при превышении лимита.
- **Mobile Token Transport (`AuthCookieHelper`, `AuthController`, `CorsConfig`)**: Передача ротируемого `refreshToken` через заголовок `X-Refresh-Token` для сохранения в Android Keystore (`expo-secure-store`) и поддержка отзыва конкретного токена в `POST /api/v1/auth/logout`.
- **Single-Flight Refresh Mutex (`zhan-finance-android/src/shared/api/http.ts`)**: Дедупликация параллельных `401` запросов при выходе из спящего режима и сохранение `refreshToken` при сетевых сбоях (`status === 0`).
- **Offline-First Engine (`mmkvStorage.ts`, `http.ts`)**: Персистентный кэш TanStack Query поверх синхронного C++ хранилища MMKV и очередь офлайн-мутаций с `Idempotency-Key`.
- **Lifecycle-Aware STOMP (`stompClient.ts`)**: Управление WebSocket-соединением по событиям `AppState` (`active` / `background`) с автоматической дельта-синхронизацией при пробуждении.
- **Device Push Registration (`V132__create_user_device_tokens.sql`, `DeviceTokenController`)**: Таблица `user_device_tokens` и REST API `/api/v1/notifications/devices` для регистрации мобильных устройств.

---

## Acceptance Criteria

- [x] [US-22.1] Логин с Android не завершает активную веб-сессию на ПК (до 5 устройств одновременно).
- [x] [US-22.2] `refreshToken` сохраняется в `expo-secure-store` и не удаляется при обрыве интернета.
- [x] [US-22.3] Офлайн-очередь мутаций сохраняет запросы с `Idempotency-Key` и отправляет их при восстановлении сети.
- [x] [US-22.4] Экраны Overview, Tasks/Pool, Chat, Billing, Documents, Profile реализованы по стандарту `DESIGN.md` (`#0a0a0c` / `#18181b`, 4 уровня типографики).
- [x] [US-22.6] 100% паритет ключей локализации для `ru`, `kk`, `en`, `zh` подтвержден автотестами.

---

## Связанные ресурсы

- Миграции: `zhan-finance-backend/src/main/resources/db/migration/V132__create_user_device_tokens.sql`
- Backend: `RefreshTokenService.java`, `AuthService.java`, `AuthController.java`, `AuthCookieHelper.java`, `DeviceTokenController.java`, `DeviceTokenService.java`
- Mobile Monolith: `zhan-finance-android/` (`app/`, `src/shared/`, `src/entities/`, `src/features/`, `DESIGN.md`)
- Тесты: `RefreshTokenRotationTest.java`, `zhan-finance-android/src/__tests__/httpMutexAndOffline.test.ts`, `zhan-finance-android/src/__tests__/i18nParity.test.ts`
