package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.dto.OnlinePaymentIntentDto;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentIntent;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPayClient;
import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPayConfig;
import com.example.zhanfinancebackend.modules.billing.freedompay.FreedomPaySigner;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.OnlinePaymentRepository;
import com.example.zhanfinancebackend.modules.billing.repository.PaymentIntentRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Freedom Pay card acquiring. The provider callback is never trusted on its own: the signature
 * must verify, amount and order must match our stored intent, and the payment is confirmed with a
 * server-side get_status3 call before anything is written to the ledger. Deliberately not
 * @Transactional as a whole: no database transaction is held open during network calls; each
 * step (intent save, ledger settlement) commits on its own and is idempotent.
 */
@Service
public class FreedomPaymentService {
    private static final Logger log = LoggerFactory.getLogger(FreedomPaymentService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final FreedomPayConfig config;
    private final FreedomPayClient client;
    private final PaymentIntentRepository intents;
    private final InvoiceRepository invoices;
    private final OnlinePaymentRepository onlinePayments;
    private final OnlinePaymentSettlementService settlement;
    private final NotificationService notifications;

    public FreedomPaymentService(FreedomPayConfig config, FreedomPayClient client, PaymentIntentRepository intents,
                                 InvoiceRepository invoices, OnlinePaymentRepository onlinePayments,
                                 OnlinePaymentSettlementService settlement, NotificationService notifications) {
        this.config = config;
        this.client = client;
        this.intents = intents;
        this.invoices = invoices;
        this.onlinePayments = onlinePayments;
        this.settlement = settlement;
        this.notifications = notifications;
    }

    public boolean isEnabled() {
        return config.isEnabled();
    }

    /** Starts (or resumes) a card payment for the client's own payable invoice. */
    public OnlinePaymentIntentDto createPayment(User client, Long invoiceId) {
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Online card payments are not available");
        }
        Invoice invoice = invoices.findByIdWithClient(invoiceId)
                .filter(i -> i.getUser() != null && i.getUser().getId().equals(client.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        if (invoice.getStatus() != Invoice.InvoiceStatus.ISSUED && invoice.getStatus() != Invoice.InvoiceStatus.OVERDUE
                || onlinePayments.existsByInvoiceId(invoice.getId())) {
            throw new ConflictException("Invoice is not payable");
        }

        Instant now = Instant.now();
        List<PaymentIntent> active = intents.findActiveForInvoice(
                invoice.getId(), client.getId(), PaymentIntent.Status.REDIRECTED, now);
        if (!active.isEmpty()) {
            return toDto(active.get(0));
        }

        PaymentIntent intent = new PaymentIntent(PaymentProvider.FREEDOM, invoice, client, newOrderId(invoice.getId()),
                invoice.getAmount(), now.plusSeconds(config.getLifetimeSeconds()));
        intent = intents.saveAndFlush(intent);
        try {
            FreedomPayClient.InitResult init = this.client.initPayment(intent.getMerchantOrderId(), intent.getAmount(),
                    "Оплата счёта #" + invoice.getId(), config.returnUrl(intent.getMerchantOrderId()));
            intent.markRedirected(init.paymentId(), init.redirectUrl());
            intents.save(intent);
            return toDto(intent);
        } catch (FreedomPayClient.GatewayException e) {
            log.error("Freedom init failed for invoice {}: {}", invoice.getId(), e.getMessage());
            intent.markFailed("gateway error");
            intents.save(intent);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment provider is unavailable");
        }
    }

    /** Client polling after the return redirect; reconciles with the provider if the callback is late. */
    public OnlinePaymentIntentDto getStatus(User client, String orderId) {
        PaymentIntent intent = intents.findByMerchantOrderId(orderId)
                .filter(i -> i.getClient().getId().equals(client.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (config.isEnabled() && intent.getStatus() == PaymentIntent.Status.REDIRECTED) {
            try {
                confirmWithProvider(intent, null, false);
            } catch (RuntimeException e) {
                log.warn("Freedom reconcile for {} failed: {}", orderId, e.getMessage());
            }
            intent = intents.findByMerchantOrderId(orderId).orElse(intent);
        }
        return toDto(intent);
    }

    /**
     * Handles the signed result_url callback. Returns the signed XML body to send back, or throws
     * GatewayException when the provider could not be consulted (the controller answers 503 and
     * Freedom Pay retries for two hours).
     */
    public String handleResult(Map<String, String> params) {
        if (!FreedomPaySigner.verify(config.resultScriptName(), params, config.getSecretKey())) {
            log.warn("Freedom result callback with invalid signature");
            return response("error", "Invalid signature");
        }
        PaymentIntent intent = intents.findByMerchantOrderId(params.getOrDefault("pg_order_id", "")).orElse(null);
        if (intent == null) {
            log.warn("Freedom result callback for unknown order");
            return response("error", "Unknown order");
        }
        BigDecimal amount = parseAmount(params.get("pg_amount"));
        String currency = params.getOrDefault("pg_currency", "KZT");
        if (amount == null || amount.compareTo(intent.getAmount()) != 0 || !"KZT".equals(currency)) {
            log.error("Freedom callback amount mismatch for order {}", intent.getMerchantOrderId());
            return response("error", "Amount mismatch");
        }
        String paymentId = params.get("pg_payment_id");
        boolean canReject = "1".equals(params.get("pg_can_reject"));
        return switch (params.getOrDefault("pg_result", "")) {
            case "1" -> confirmWithProvider(intent, paymentId, canReject);
            case "0" -> {
                if (intent.getStatus() != PaymentIntent.Status.PAID) {
                    intent.markFailed("provider reported failure");
                    saveQuietly(intent);
                }
                yield response("ok", "Failure recorded");
            }
            default -> response("ok", "Pending");
        };
    }

    private String confirmWithProvider(PaymentIntent intent, String callbackPaymentId, boolean canReject) {
        if (intent.getStatus() == PaymentIntent.Status.PAID) {
            return response("ok", "Already accepted");
        }
        FreedomPayClient.StatusResult status = client.getStatus(intent.getMerchantOrderId());
        boolean matches = status.isSuccessful()
                && intent.getMerchantOrderId().equals(status.orderId())
                && status.paymentId() != null
                && (callbackPaymentId == null || callbackPaymentId.equals(status.paymentId()))
                && (intent.getProviderPaymentId() == null || intent.getProviderPaymentId().equals(status.paymentId()))
                && status.amount() != null && status.amount().compareTo(intent.getAmount()) == 0
                && (status.currency() == null || "KZT".equals(status.currency()));
        if (!matches) {
            if (callbackPaymentId != null) {
                log.error("Freedom callback for order {} not confirmed by get_status3", intent.getMerchantOrderId());
                return response("error", "Payment not confirmed");
            }
            return response("ok", "Not paid yet");
        }
        try {
            settlement.settle(PaymentProvider.FREEDOM, status.paymentId(), intent.getInvoice().getId(),
                    intent.getAmount(), "KZT");
        } catch (ConflictException e) {
            return handleUnsettleable(intent, status.paymentId(), canReject, e);
        }
        intent.markPaid(status.paymentId());
        saveQuietly(intent);
        return response("ok", "Accepted");
    }

    /** Provider took the money but the invoice can no longer be credited (e.g. paid another way). */
    private String handleUnsettleable(PaymentIntent intent, String paymentId, boolean canReject, ConflictException e) {
        intent.markFailed("not creditable: " + e.getMessage());
        saveQuietly(intent);
        log.error("Freedom payment {} for invoice {} could not be credited: {}", paymentId,
                intent.getInvoice().getId(), e.getMessage());
        if (canReject) {
            return response("rejected", "Invoice is not payable");
        }
        try {
            notifications.notifyAdmins("Требуется возврат платежа",
                    "Freedom Pay получил платёж " + paymentId + " по счёту #" + intent.getInvoice().getId()
                            + ", но счёт уже не принимает оплату. Нужен возврат.",
                    "/admin/billing/receipts");
        } catch (RuntimeException ex) {
            log.warn("Failed to notify admins about refund-needed payment {}", paymentId);
        }
        return response("ok", "Recorded for manual refund");
    }

    private void saveQuietly(PaymentIntent intent) {
        try {
            intents.save(intent);
        } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException e) {
            // A concurrent callback or poll already updated this intent; the ledger is the source of truth.
            log.info("Concurrent update of intent {} ignored", intent.getMerchantOrderId());
        }
    }

    String response(String status, String description) {
        Map<String, String> body = new TreeMap<>();
        body.put("pg_status", status);
        body.put("pg_description", description);
        body.put("pg_salt", HexFormat.of().formatHex(randomBytes(8)));
        String sig = FreedomPaySigner.sign(config.resultScriptName(), body, config.getSecretKey());
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><response>"
                + "<pg_status>" + status + "</pg_status>"
                + "<pg_description>" + escape(description) + "</pg_description>"
                + "<pg_salt>" + body.get("pg_salt") + "</pg_salt>"
                + "<pg_sig>" + sig + "</pg_sig></response>";
    }

    private OnlinePaymentIntentDto toDto(PaymentIntent i) {
        String redirect = i.getStatus() == PaymentIntent.Status.REDIRECTED ? i.getRedirectUrl() : null;
        return new OnlinePaymentIntentDto(i.getMerchantOrderId(), i.getInvoice().getId(), i.getAmount(),
                i.getCurrency(), i.getStatus().name(), redirect, i.getFailureReason());
    }

    private static String newOrderId(Long invoiceId) {
        return "ZF" + invoiceId + "-" + HexFormat.of().formatHex(randomBytes(8));
    }

    private static byte[] randomBytes(int n) {
        byte[] b = new byte[n];
        RANDOM.nextBytes(b);
        return b;
    }

    private static BigDecimal parseAmount(String s) {
        try {
            return s == null ? null : new BigDecimal(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
