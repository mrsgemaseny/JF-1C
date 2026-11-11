# Kaspi Pay — предварительный черновик интеграции (JF-1C)

> Трек: **Платежи на Kaspi.kz → Поставщики услуг**
> **Не является официальным протоколом Kaspi и не готов к реализации.** Эндпоинты,
> поля, коды ответов, аутентификация и схема вызовов ниже — гипотезы. Они должны быть
> заменены на подтверждённую документацию Kaspi после подключения. Примеры кода
> также не соответствуют текущим сущностям JF-1C и не должны копироваться в проект.

---

## 1. Архитектура

Kaspi работает по **инвертированной модели**: не ты вызываешь Kaspi, а Kaspi вызывает твой API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kaspi.kz App                             │
│  Клиент → Платежи → ЖАН FINANCE → вводит account (телефон)     │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS (только с IP Kaspi)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx (IP Whitelist)                         │
│              только IP-адреса из списка Kaspi                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              KaspiPaymentController                              │
│  GET  /api/v1/kaspi/check   ← проверка аккаунта + сумма        │
│  POST /api/v1/kaspi/pay     ← проведение платежа               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────┐    ┌────────────────────────────┐
│    KaspiPaymentService        │    │    InvoiceService          │
│  - Idempotency check          │───►│  - PAID status update      │
│  - State machine              │    │  - AuditLog                │
│  - Signature verify           │    └────────────────────────────┘
│  - Transaction persist        │
└───────────────────────┬───────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌──────────────────┐       ┌─────────────────────────┐
│ kaspi_transactions│       │  Spring Events          │
│ (audit trail)    │       │  → Email (paid notify)  │
└──────────────────┘       │  → TG Bot push          │
                           │  → WebSocket (UI update) │
                           └─────────────────────────┘
```

---

## 2. Database Schema

### V128 — kaspi_transactions

```sql
-- V128__kaspi_payment_integration.sql

CREATE TYPE kaspi_tx_status AS ENUM (
    'CHECK_RECEIVED',    -- Kaspi запросил проверку
    'CHECK_OK',          -- аккаунт найден, сумма отдана
    'CHECK_FAILED',      -- аккаунт не найден
    'PAY_RECEIVED',      -- Kaspi прислал платёж
    'PAY_SUCCESS',       -- платёж принят, инвойс закрыт
    'PAY_DUPLICATE',     -- повторный запрос — вернули cached ответ
    'PAY_FAILED'         -- что-то пошло не так
);

CREATE TABLE kaspi_transactions (
    id               BIGSERIAL PRIMARY KEY,
    txn_id           VARCHAR(100) UNIQUE NOT NULL,       -- ID транзакции от Kaspi (idempotency key)
    txn_date         TIMESTAMP WITH TIME ZONE,
    account          VARCHAR(100) NOT NULL,               -- телефон/договор клиента
    amount           DECIMAL(15,2),
    invoice_id       BIGINT REFERENCES invoices(id),
    status           kaspi_tx_status NOT NULL DEFAULT 'CHECK_RECEIVED',
    result_code      INTEGER,                             -- код ответа Kaspi (0=ok, 1=not found, ...)
    prv_txn_id       VARCHAR(100),                        -- наш внутренний ID (для Kaspi)
    raw_request      TEXT NOT NULL,                       -- весь raw запрос (для дебага и сверки)
    raw_response     TEXT,                                -- наш ответ (для сверки)
    ip_address       INET,                                -- IP откуда пришёл запрос
    error_message    TEXT,
    processed_at     TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kaspi_transactions_txn_id    ON kaspi_transactions(txn_id);
CREATE INDEX idx_kaspi_transactions_account   ON kaspi_transactions(account);
CREATE INDEX idx_kaspi_transactions_invoice   ON kaspi_transactions(invoice_id);
CREATE INDEX idx_kaspi_transactions_status    ON kaspi_transactions(status);
CREATE INDEX idx_kaspi_transactions_created   ON kaspi_transactions(created_at DESC);

-- Автоматический updated_at
CREATE TRIGGER kaspi_transactions_updated_at
    BEFORE UPDATE ON kaspi_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Таблица для сверки (reconciliation) — ежедневный реестр от Kaspi
CREATE TABLE kaspi_reconciliation_reports (
    id           BIGSERIAL PRIMARY KEY,
    report_date  DATE NOT NULL UNIQUE,
    total_count  INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    raw_report   TEXT NOT NULL,
    matched      BOOLEAN DEFAULT FALSE,
    mismatch_details TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Entity

```java
// entity/KaspiTransaction.java
package com.zhanfinance.kaspi.entity;

@Entity
@Table(name = "kaspi_transactions")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class KaspiTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "txn_id", nullable = false, unique = true, length = 100)
    private String txnId;

    @Column(name = "txn_date")
    private OffsetDateTime txnDate;

    @Column(name = "account", nullable = false, length = 100)
    private String account;

    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private KaspiTxStatus status;

    @Column(name = "result_code")
    private Integer resultCode;

    @Column(name = "prv_txn_id", length = 100)
    private String prvTxnId;

    @Column(name = "raw_request", nullable = false, columnDefinition = "TEXT")
    private String rawRequest;

    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;

    @Column(name = "ip_address", columnDefinition = "INET")
    private String ipAddress;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

```java
// entity/KaspiTxStatus.java
public enum KaspiTxStatus {
    CHECK_RECEIVED,
    CHECK_OK,
    CHECK_FAILED,
    PAY_RECEIVED,
    PAY_SUCCESS,
    PAY_DUPLICATE,
    PAY_FAILED
}
```

---

## 4. DTOs

```java
// dto/KaspiCheckRequest.java
@Getter @Setter
public class KaspiCheckRequest {
    @NotBlank private String txnId;      // ID транзакции Kaspi
    @NotBlank private String account;    // телефон или номер договора клиента
    private BigDecimal sum;              // сумма (Kaspi может передавать)
    private String command;              // "check" (Kaspi передаёт тип операции)
}

// dto/KaspiCheckResponse.java
@Getter @Builder
public class KaspiCheckResponse {
    private String txnId;
    private int result;                  // 0=ok, 1=not found, 5=unavailable
    private Map<String, Object> fields;  // name, amount, comment и пр.
    private String comment;
}

// dto/KaspiPayRequest.java
@Getter @Setter
public class KaspiPayRequest {
    @NotBlank private String txnId;
    @NotBlank private String account;
    @NotNull  private BigDecimal sum;
    private String txnDate;              // ISO datetime
    private String command;              // "pay"
}

// dto/KaspiPayResponse.java
@Getter @Builder
public class KaspiPayResponse {
    private String txnId;
    private String prvTxn;               // наш внутренний ID
    private int result;
    private BigDecimal sum;
    private String comment;

    public static KaspiPayResponse success(String txnId, String prvTxn, BigDecimal sum) {
        return KaspiPayResponse.builder()
            .txnId(txnId).prvTxn(prvTxn).sum(sum).result(0).comment("OK").build();
    }

    public static KaspiPayResponse duplicate(String txnId, String prvTxn, BigDecimal sum) {
        return KaspiPayResponse.builder()
            .txnId(txnId).prvTxn(prvTxn).sum(sum).result(0).comment("Duplicate — already processed").build();
    }

    public static KaspiPayResponse error(String txnId, int code, String comment) {
        return KaspiPayResponse.builder()
            .txnId(txnId).result(code).comment(comment).build();
    }
}
```

---

## 5. Repository

```java
// repository/KaspiTransactionRepository.java
@Repository
public interface KaspiTransactionRepository extends JpaRepository<KaspiTransaction, Long> {

    Optional<KaspiTransaction> findByTxnId(String txnId);

    boolean existsByTxnId(String txnId);

    @Query("SELECT kt FROM KaspiTransaction kt WHERE kt.account = :account AND kt.status = 'PAY_SUCCESS' ORDER BY kt.createdAt DESC")
    List<KaspiTransaction> findSuccessfulByAccount(@Param("account") String account);

    @Query("SELECT kt FROM KaspiTransaction kt WHERE kt.invoice.id = :invoiceId AND kt.status = 'PAY_SUCCESS'")
    Optional<KaspiTransaction> findSuccessfulByInvoiceId(@Param("invoiceId") Long invoiceId);

    @Query("SELECT kt FROM KaspiTransaction kt WHERE kt.createdAt >= :from AND kt.createdAt <= :to")
    List<KaspiTransaction> findByDateRange(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    @Query("SELECT SUM(kt.amount) FROM KaspiTransaction kt WHERE kt.status = 'PAY_SUCCESS' AND DATE(kt.createdAt) = :date")
    Optional<BigDecimal> sumSuccessfulByDate(@Param("date") LocalDate date);
}
```

---

## 6. Service (ядро интеграции)

```java
// service/KaspiPaymentService.java
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class KaspiPaymentService {

    private final KaspiTransactionRepository kaspiTxRepo;
    private final InvoiceRepository invoiceRepo;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    // ----------------------------------------------------------------
    // CHECK — Kaspi проверяет существование аккаунта
    // ----------------------------------------------------------------

    @Transactional
    public KaspiCheckResponse check(KaspiCheckRequest request, String rawBody, String ipAddress) {
        log.info("[Kaspi CHECK] txnId={} account={} ip={}", request.getTxnId(), request.getAccount(), ipAddress);

        KaspiTransaction tx = KaspiTransaction.builder()
            .txnId(request.getTxnId())
            .account(request.getAccount())
            .amount(request.getSum())
            .status(KaspiTxStatus.CHECK_RECEIVED)
            .rawRequest(rawBody)
            .ipAddress(ipAddress)
            .build();

        try {
            // Ищем клиента по номеру телефона (или номеру договора)
            Invoice invoice = invoiceRepo.findPendingByClientPhone(request.getAccount())
                .orElse(null);

            if (invoice == null) {
                tx.setStatus(KaspiTxStatus.CHECK_FAILED);
                tx.setResultCode(1);
                kaspiTxRepo.save(tx);

                log.warn("[Kaspi CHECK] account not found: {}", request.getAccount());
                return KaspiCheckResponse.builder()
                    .txnId(request.getTxnId())
                    .result(1)
                    .comment("Account not found")
                    .build();
            }

            tx.setInvoice(invoice);
            tx.setAmount(invoice.getAmount());
            tx.setStatus(KaspiTxStatus.CHECK_OK);
            tx.setResultCode(0);

            KaspiCheckResponse response = KaspiCheckResponse.builder()
                .txnId(request.getTxnId())
                .result(0)
                .fields(Map.of(
                    "name",    invoice.getClient().getFullName(),
                    "amount",  invoice.getAmount(),
                    "comment", "Инвойс #" + invoice.getInvoiceNumber()
                ))
                .build();

            tx.setRawResponse(toJson(response));
            kaspiTxRepo.save(tx);
            return response;

        } catch (Exception e) {
            log.error("[Kaspi CHECK] Internal error txnId={}", request.getTxnId(), e);
            tx.setStatus(KaspiTxStatus.PAY_FAILED);
            tx.setResultCode(5);
            tx.setErrorMessage(e.getMessage());
            kaspiTxRepo.save(tx);

            return KaspiCheckResponse.builder()
                .txnId(request.getTxnId())
                .result(5)
                .comment("Service temporarily unavailable")
                .build();
        }
    }

    // ----------------------------------------------------------------
    // PAY — Kaspi проводит платёж
    // ----------------------------------------------------------------

    @Transactional
    public KaspiPayResponse pay(KaspiPayRequest request, String rawBody, String ipAddress) {
        log.info("[Kaspi PAY] txnId={} account={} amount={} ip={}",
            request.getTxnId(), request.getAccount(), request.getSum(), ipAddress);

        // === IDEMPOTENCY CHECK ===
        // Если уже обработали этот txnId — возвращаем cached ответ
        Optional<KaspiTransaction> existing = kaspiTxRepo.findByTxnId(request.getTxnId());
        if (existing.isPresent()) {
            KaspiTransaction cached = existing.get();
            if (cached.getStatus() == KaspiTxStatus.PAY_SUCCESS) {
                log.warn("[Kaspi PAY] Duplicate txnId={}, returning cached response", request.getTxnId());
                cached.setStatus(KaspiTxStatus.PAY_DUPLICATE);
                kaspiTxRepo.save(cached);
                return KaspiPayResponse.duplicate(request.getTxnId(), cached.getPrvTxnId(), cached.getAmount());
            }
        }

        KaspiTransaction tx = KaspiTransaction.builder()
            .txnId(request.getTxnId())
            .account(request.getAccount())
            .amount(request.getSum())
            .status(KaspiTxStatus.PAY_RECEIVED)
            .rawRequest(rawBody)
            .ipAddress(ipAddress)
            .build();

        try {
            // Найти инвойс
            Invoice invoice = invoiceRepo.findPendingByClientPhone(request.getAccount())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Invoice not found for account: " + request.getAccount()));

            // Проверить сумму (опционально — Kaspi мог изменить)
            if (invoice.getAmount().compareTo(request.getSum()) != 0) {
                log.warn("[Kaspi PAY] Amount mismatch: expected={} got={}", invoice.getAmount(), request.getSum());
                // Решение: принять Kaspi-сумму (они авторитетны) или вернуть ошибку
                // Для бухгалтерии — принимаем только точную сумму
                tx.setStatus(KaspiTxStatus.PAY_FAILED);
                tx.setResultCode(4);
                tx.setErrorMessage("Amount mismatch");
                kaspiTxRepo.save(tx);
                return KaspiPayResponse.error(request.getTxnId(), 4, "Amount mismatch");
            }

            // Провести платёж
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(OffsetDateTime.now());
            invoice.setPaidVia("KASPI_PAY");
            invoiceRepo.save(invoice);

            String prvTxnId = "KSP-" + invoice.getInvoiceNumber() + "-" + System.currentTimeMillis();

            tx.setInvoice(invoice);
            tx.setPrvTxnId(prvTxnId);
            tx.setStatus(KaspiTxStatus.PAY_SUCCESS);
            tx.setResultCode(0);
            tx.setProcessedAt(OffsetDateTime.now());

            KaspiPayResponse response = KaspiPayResponse.success(request.getTxnId(), prvTxnId, request.getSum());
            tx.setRawResponse(toJson(response));
            kaspiTxRepo.save(tx);

            // Асинхронные события (AFTER_COMMIT — не внутри транзакции)
            eventPublisher.publishEvent(new KaspiPaymentSuccessEvent(invoice, tx));

            log.info("[Kaspi PAY] SUCCESS txnId={} invoiceId={} amount={}",
                request.getTxnId(), invoice.getId(), request.getSum());

            return response;

        } catch (ResourceNotFoundException e) {
            tx.setStatus(KaspiTxStatus.PAY_FAILED);
            tx.setResultCode(1);
            tx.setErrorMessage(e.getMessage());
            kaspiTxRepo.save(tx);
            return KaspiPayResponse.error(request.getTxnId(), 1, "Account not found");

        } catch (Exception e) {
            log.error("[Kaspi PAY] Internal error txnId={}", request.getTxnId(), e);
            tx.setStatus(KaspiTxStatus.PAY_FAILED);
            tx.setResultCode(5);
            tx.setErrorMessage(e.getMessage());
            kaspiTxRepo.save(tx);
            return KaspiPayResponse.error(request.getTxnId(), 5, "Internal server error");
        }
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{}"; }
    }
}
```

---

## 7. Event Listener (уведомления после коммита)

```java
// event/KaspiPaymentSuccessEvent.java
@Getter
@RequiredArgsConstructor
public class KaspiPaymentSuccessEvent {
    private final Invoice invoice;
    private final KaspiTransaction transaction;
}

// event/KaspiPaymentEventListener.java
@Component
@Slf4j
@RequiredArgsConstructor
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public class KaspiPaymentEventListener {

    private final EmailService emailService;
    private final TelegramNotificationService telegramService;
    private final SimpMessagingTemplate websocket;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onKaspiPaymentSuccess(KaspiPaymentSuccessEvent event) {
        Invoice invoice = event.getInvoice();
        log.info("[KaspiEvent] Invoice #{} paid via Kaspi", invoice.getInvoiceNumber());

        // Email клиенту
        emailService.sendInvoicePaidNotification(invoice);

        // TG Bot — push сотруднику
        telegramService.notifyInvoicePaid(invoice, "Kaspi Pay", event.getTransaction().getAmount());

        // WebSocket — обновить UI без перезагрузки
        websocket.convertAndSend(
            "/topic/invoices/" + invoice.getId(),
            Map.of("status", "PAID", "paidVia", "KASPI_PAY")
        );
    }
}
```

---

## 8. Controller

```java
// controller/KaspiPaymentController.java
@RestController
@RequestMapping("/api/v1/kaspi")
@Slf4j
@RequiredArgsConstructor
public class KaspiPaymentController {

    private final KaspiPaymentService kaspiPaymentService;
    private final KaspiIpValidator ipValidator;

    @GetMapping("/check")
    public ResponseEntity<KaspiCheckResponse> check(
            @Valid KaspiCheckRequest request,
            HttpServletRequest httpRequest) {

        String ip = extractIp(httpRequest);
        ipValidator.validate(ip); // бросает 403 если не из Kaspi

        String rawBody = buildRawQuery(request);
        KaspiCheckResponse response = kaspiPaymentService.check(request, rawBody, ip);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/pay")
    public ResponseEntity<KaspiPayResponse> pay(
            @Valid @RequestBody KaspiPayRequest request,
            HttpServletRequest httpRequest) {

        String ip = extractIp(httpRequest);
        ipValidator.validate(ip);

        String rawBody;
        try {
            rawBody = new ObjectMapper().writeValueAsString(request);
        } catch (Exception e) {
            rawBody = request.toString();
        }

        KaspiPayResponse response = kaspiPaymentService.pay(request, rawBody, ip);
        return ResponseEntity.ok(response);
    }

    private String extractIp(HttpServletRequest req) {
        // Cloudflare / прокси
        String cfIp = req.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank()) return cfIp;
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private String buildRawQuery(KaspiCheckRequest req) {
        return "txn_id=" + req.getTxnId() + "&account=" + req.getAccount()
            + (req.getSum() != null ? "&sum=" + req.getSum() : "");
    }
}
```

---

## 9. Security — IP Whitelist

```java
// security/KaspiIpValidator.java
@Component
@Slf4j
public class KaspiIpValidator {

    // IP-адреса Kaspi — получить из официальной документации после договора
    // Пример (заглушка, заменить на реальные):
    private static final Set<String> KASPI_IPS = Set.of(
        "placeholder.kaspi.ip.1",
        "placeholder.kaspi.ip.2"
    );

    @Value("${kaspi.ip-whitelist-enabled:true}")
    private boolean whitelistEnabled;

    public void validate(String ip) {
        if (!whitelistEnabled) {
            log.warn("[KaspiSecurity] IP whitelist DISABLED — dev mode");
            return;
        }
        if (!KASPI_IPS.contains(ip)) {
            log.error("[KaspiSecurity] Rejected request from unknown IP: {}", ip);
            throw new AccessDeniedException("IP not in Kaspi whitelist: " + ip);
        }
    }
}
```

```java
// security/KaspiSecurityConfig.java
// Kaspi-эндпоинты НЕ требуют JWT — они вызываются напрямую Kaspi
// Добавить в SecurityConfig:

.requestMatchers("/api/v1/kaspi/**").permitAll()
// Защита через IP whitelist в KaspiIpValidator (не через JWT)
```

---

## 10. Nginx — IP Whitelist на уровне сервера

```nginx
# /etc/nginx/conf.d/kaspi-whitelist.conf

geo $kaspi_allowed {
    default         0;
    # Реальные IP от Kaspi — из официальной документации
    # placeholder/kaspi/ip/range  1;
}

server {
    location /api/v1/kaspi/ {
        if ($kaspi_allowed = 0) {
            return 403 "Forbidden";
        }
        proxy_pass http://backend:8080;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 11. Reconciliation (ежедневная сверка)

```java
// service/KaspiReconciliationService.java
@Service
@Slf4j
@RequiredArgsConstructor
public class KaspiReconciliationService {

    private final KaspiTransactionRepository kaspiTxRepo;
    private final KaspiReconciliationReportRepository reportRepo;
    private final TelegramNotificationService telegramService;

    // Запускается каждый день в 02:00 (после того как Kaspi присылает суточный реестр)
    @Scheduled(cron = "0 0 2 * * *")
    public void reconcile() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("[Kaspi Reconcile] Starting for date: {}", yesterday);

        BigDecimal ourTotal = kaspiTxRepo.sumSuccessfulByDate(yesterday)
            .orElse(BigDecimal.ZERO);

        // TODO: получить реестр от Kaspi через их API или email
        // После получения официальных docs — реализовать парсинг реестра
        // Kaspi присылает ежедневный реестр на email или через API

        log.info("[Kaspi Reconcile] Our total for {}: {}", yesterday, ourTotal);
        // Если есть расхождения — алерт в TG
    }

    public void reconcileWithReport(String kaspiReportRaw, LocalDate date) {
        BigDecimal ourTotal = kaspiTxRepo.sumSuccessfulByDate(date).orElse(BigDecimal.ZERO);
        // Парсить kaspiReportRaw, сравнить с ourTotal
        // При расхождении > 0 — алерт и сохранение в kaspi_reconciliation_reports
    }
}
```

---

## 12. Invoice Repository — поиск по телефону

```java
// InvoiceRepository — добавить:

@Query("""
    SELECT i FROM Invoice i
    JOIN i.client c
    WHERE c.phone = :phone
      AND i.status = 'PENDING'
    ORDER BY i.createdAt DESC
    LIMIT 1
""")
Optional<Invoice> findPendingByClientPhone(@Param("phone") String phone);
```

> **[WARNING]** Идентификатор клиента в Kaspi — уточнить у Kaspi: это телефон или номер договора? От этого зависит поле поиска. Возможно, нужно будет добавить `kaspi_account_id` в таблицу клиентов.

---

## 13. Frontend — динамическое состояние

```tsx
// features/billing/ui/InvoicePaymentPanel.tsx
import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/shared/lib/websocket';

interface Props {
  invoice: Invoice;
}

export const InvoicePaymentPanel = ({ invoice }: Props) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Подписываемся на обновления инвойса через WebSocket
    // Когда Kaspi оплатит — UI обновится автоматически без перезагрузки
    const unsub = subscribe(`/topic/invoices/${invoice.id}`, (data) => {
      if (data.status === 'PAID') {
        // Обновить состояние React Query
        queryClient.invalidateQueries(['invoices', invoice.id]);
      }
    });
    return unsub;
  }, [invoice.id]);

  if (invoice.status === 'PAID') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="font-medium text-green-800">Оплачено через Kaspi Pay</p>
        <p className="text-sm text-green-600">
          {formatMoney(invoice.amount)} · {formatDate(invoice.paidAt)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 text-sm font-medium text-gray-700">
        Оплата через Kaspi QR
      </p>

      {/* Статический QR — до получения API Kaspi */}
      <div className="flex flex-col items-center gap-3">
        <img
          src="/kaspi-qr-static.png"
          alt="Kaspi QR для оплаты"
          className="h-48 w-48 rounded-lg"
        />
        <div className="text-center">
          <p className="text-lg font-semibold">{formatMoney(invoice.amount)}</p>
          <p className="text-xs text-gray-400">
            Введите эту сумму вручную при оплате
          </p>
        </div>
      </div>

      {/* Загрузка чека — временно, пока нет автоматики */}
      <div className="mt-4 border-t pt-4">
        <p className="mb-2 text-xs text-gray-500">
          После оплаты прикрепите скриншот подтверждения:
        </p>
        <ReceiptUploadButton invoiceId={invoice.id} />
      </div>
    </div>
  );
};
```

---

## 14. Тесты

```java
// test/KaspiPaymentServiceTest.java
@ExtendWith(MockitoExtension.class)
class KaspiPaymentServiceTest {

    @Mock private KaspiTransactionRepository kaspiTxRepo;
    @Mock private InvoiceRepository invoiceRepo;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private KaspiPaymentService service;

    @Test
    void check_accountExists_returnsResult0() {
        Invoice invoice = buildInvoice("77012345678", BigDecimal.valueOf(30000));
        when(invoiceRepo.findPendingByClientPhone("77012345678")).thenReturn(Optional.of(invoice));

        KaspiCheckRequest req = new KaspiCheckRequest();
        req.setTxnId("TX-001"); req.setAccount("77012345678");

        KaspiCheckResponse resp = service.check(req, "{}", "1.2.3.4");

        assertThat(resp.getResult()).isEqualTo(0);
        assertThat(resp.getFields().get("amount")).isEqualTo(BigDecimal.valueOf(30000));
    }

    @Test
    void check_accountNotFound_returnsResult1() {
        when(invoiceRepo.findPendingByClientPhone(anyString())).thenReturn(Optional.empty());

        KaspiCheckRequest req = new KaspiCheckRequest();
        req.setTxnId("TX-002"); req.setAccount("77099999999");

        KaspiCheckResponse resp = service.check(req, "{}", "1.2.3.4");

        assertThat(resp.getResult()).isEqualTo(1);
    }

    @Test
    void pay_success_invoiceMarkedAsPaid() {
        Invoice invoice = buildInvoice("77012345678", BigDecimal.valueOf(30000));
        when(invoiceRepo.findPendingByClientPhone("77012345678")).thenReturn(Optional.of(invoice));
        when(kaspiTxRepo.findByTxnId(anyString())).thenReturn(Optional.empty());

        KaspiPayRequest req = new KaspiPayRequest();
        req.setTxnId("TX-003"); req.setAccount("77012345678"); req.setSum(BigDecimal.valueOf(30000));

        KaspiPayResponse resp = service.pay(req, "{}", "1.2.3.4");

        assertThat(resp.getResult()).isEqualTo(0);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
        verify(eventPublisher).publishEvent(any(KaspiPaymentSuccessEvent.class));
    }

    @Test
    void pay_duplicate_returnsCachedResponse() {
        KaspiTransaction existing = KaspiTransaction.builder()
            .txnId("TX-004").status(KaspiTxStatus.PAY_SUCCESS)
            .prvTxnId("KSP-INV-001-123").amount(BigDecimal.valueOf(30000)).build();
        when(kaspiTxRepo.findByTxnId("TX-004")).thenReturn(Optional.of(existing));

        KaspiPayRequest req = new KaspiPayRequest();
        req.setTxnId("TX-004"); req.setAccount("77012345678"); req.setSum(BigDecimal.valueOf(30000));

        KaspiPayResponse resp = service.pay(req, "{}", "1.2.3.4");

        assertThat(resp.getResult()).isEqualTo(0);
        assertThat(resp.getComment()).contains("Duplicate");
        verify(invoiceRepo, never()).save(any());
    }

    @Test
    void pay_amountMismatch_returnsResult4() {
        Invoice invoice = buildInvoice("77012345678", BigDecimal.valueOf(30000));
        when(invoiceRepo.findPendingByClientPhone("77012345678")).thenReturn(Optional.of(invoice));
        when(kaspiTxRepo.findByTxnId(anyString())).thenReturn(Optional.empty());

        KaspiPayRequest req = new KaspiPayRequest();
        req.setTxnId("TX-005"); req.setAccount("77012345678"); req.setSum(BigDecimal.valueOf(25000));

        KaspiPayResponse resp = service.pay(req, "{}", "1.2.3.4");

        assertThat(resp.getResult()).isEqualTo(4);
    }

    private Invoice buildInvoice(String phone, BigDecimal amount) {
        Client client = Client.builder().phone(phone).fullName("Иванов Иван").build();
        return Invoice.builder().client(client).amount(amount)
            .status(InvoiceStatus.PENDING).invoiceNumber("INV-001").build();
    }
}
```

---

## 15. Коды результатов

| Код | Значение |
|-----|----------|
| `0` | Успех |
| `1` | Аккаунт (клиент) не найден |
| `4` | Некорректная сумма |
| `5` | Временная ошибка сервиса (Kaspi повторит запрос) |

---

## 16. Checklist запуска

### До начала кодинга
- [ ] Получен ответ от Kaspi по заявке (подана 09.11)
- [ ] Подписан договор
- [ ] Получены: IP-адреса Kaspi, test credentials, официальная документация протокола
- [ ] Определён идентификатор клиента (телефон / номер договора)
- [ ] Есть тестовая среда Kaspi (sandbox)

### Backend
- [ ] V128 — миграция `kaspi_transactions`, `kaspi_reconciliation_reports`
- [ ] `KaspiTransaction` entity
- [ ] `KaspiPaymentService` (check + pay + idempotency)
- [ ] `KaspiPaymentController`
- [ ] `KaspiIpValidator` — заполнить реальными IP из документации
- [ ] `KaspiPaymentEventListener` (email + TG + WS)
- [ ] `InvoiceRepository.findPendingByClientPhone()`
- [ ] Unit тесты (8+ кейсов)
- [ ] E2E тест: мок Kaspi → check → pay → invoice PAID

### Infrastructure
- [ ] Nginx IP whitelist — реальные IP из документации Kaspi
- [ ] `kaspi.ip-whitelist-enabled=true` в prod `.env`
- [ ] SSL на эндпоинте (Kaspi требует HTTPS)
- [ ] Логирование всех входящих запросов от Kaspi в `kaspi_transactions.raw_request`

### Frontend
- [ ] `InvoicePaymentPanel` со статическим QR (сейчас)
- [ ] WebSocket подписка на `/topic/invoices/{id}` — автообновление при оплате
- [ ] После получения API — убрать ручной чек, QR становится автоматическим

### Операционное
- [ ] TG-алерт при `PAY_FAILED`
- [ ] Суточная сверка с реестром Kaspi (после получения docs на формат реестра)

---

## 17. Структура пакетов

```
com.zhanfinance/
  kaspi/
    controller/
      KaspiPaymentController.java
    service/
      KaspiPaymentService.java
      KaspiReconciliationService.java
    repository/
      KaspiTransactionRepository.java
      KaspiReconciliationReportRepository.java
    entity/
      KaspiTransaction.java
      KaspiReconciliationReport.java
      KaspiTxStatus.java (enum)
    dto/
      KaspiCheckRequest.java
      KaspiCheckResponse.java
      KaspiPayRequest.java
      KaspiPayResponse.java
    event/
      KaspiPaymentSuccessEvent.java
      KaspiPaymentEventListener.java
    security/
      KaspiIpValidator.java
```
