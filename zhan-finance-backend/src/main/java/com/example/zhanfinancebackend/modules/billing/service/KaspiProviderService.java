package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.KaspiCallback;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.KaspiCallbackRepository;
import com.example.zhanfinancebackend.modules.billing.repository.OnlinePaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.regex.Pattern;

/**
 * Kaspi "Платежи на Kaspi.kz" provider protocol. Kaspi calls us (GET) with command=check|pay.
 * The account the payer types in Kaspi is the invoice number. Every response is stored under
 * (txn_id, command) so Kaspi retries get the identical answer and never double-credit.
 *
 * Result codes: 0 ok, 1 temporary error, 2 wrong account format, 3 account not found,
 * 4 payment not possible, 5 other error.
 */
@Service
public class KaspiProviderService {
    private static final Logger log = LoggerFactory.getLogger(KaspiProviderService.class);
    private static final Pattern ACCOUNT = Pattern.compile("\\d{1,18}");
    private static final Pattern TXN_ID = Pattern.compile("[A-Za-z0-9_-]{1,32}");
    private static final Pattern TXN_DATE = Pattern.compile("\\d{14}");

    private final boolean enabled;
    private final CidrAllowlist allowlist;
    private final InvoiceRepository invoices;
    private final OnlinePaymentRepository onlinePayments;
    private final KaspiCallbackRepository callbacks;
    private final OnlinePaymentSettlementService settlement;

    public KaspiProviderService(@Value("${app.payments.kaspi.enabled:false}") boolean enabled,
                                @Value("${app.payments.kaspi.allowed-ips:}") String allowedIps,
                                InvoiceRepository invoices,
                                OnlinePaymentRepository onlinePayments,
                                KaspiCallbackRepository callbacks,
                                OnlinePaymentSettlementService settlement) {
        this.enabled = enabled;
        this.allowlist = new CidrAllowlist(Arrays.asList(allowedIps.split(",")));
        this.invoices = invoices;
        this.onlinePayments = onlinePayments;
        this.callbacks = callbacks;
        this.settlement = settlement;
        if (enabled && allowlist.isEmpty()) {
            throw new IllegalStateException("app.payments.kaspi.enabled=true requires app.payments.kaspi.allowed-ips");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** Disabled or unlisted callers must look like a missing endpoint. */
    public boolean isCallerAllowed(String clientIp) {
        return enabled && allowlist.contains(clientIp);
    }

    public String handle(String command, String txnId, String account, String sum, String txnDate, String clientIp) {
        if (txnId == null || !TXN_ID.matcher(txnId).matches()) {
            return xml(txnId == null ? "" : sanitize(txnId), 5, null, null, "Invalid txn_id");
        }
        if (!"check".equals(command) && !"pay".equals(command)) {
            return xml(txnId, 5, null, null, "Unknown command");
        }
        KaspiCallback previous = callbacks.findByTxnIdAndCommand(txnId, command).orElse(null);
        if (previous != null) {
            return previous.getResponseBody();
        }
        Outcome outcome = "check".equals(command) ? check(txnId, account) : pay(txnId, account, sum, txnDate);
        String body = xml(txnId, outcome.code, outcome.prvTxnId, outcome.sum, outcome.comment);
        try {
            callbacks.saveAndFlush(new KaspiCallback(txnId, command, truncate(account, 200),
                    outcome.parsedSum, txnDate != null && TXN_DATE.matcher(txnDate).matches() ? txnDate : null,
                    outcome.invoiceId, outcome.code, outcome.prvTxnId, body, truncate(clientIp, 64)));
        } catch (DataIntegrityViolationException race) {
            // A concurrent retry stored its answer first; return that one so both agree.
            return callbacks.findByTxnIdAndCommand(txnId, command).map(KaspiCallback::getResponseBody).orElse(body);
        }
        return body;
    }

    private Outcome check(String txnId, String account) {
        Invoice invoice;
        try {
            invoice = resolveInvoice(account);
        } catch (BadRequestException e) {
            return Outcome.of(2, "Invalid account");
        } catch (ResourceNotFoundException e) {
            return Outcome.of(3, "Account not found");
        }
        if (!isPayable(invoice)) {
            return Outcome.of(4, "Invoice is not payable").withInvoice(invoice.getId());
        }
        return Outcome.of(0, "OK").withInvoice(invoice.getId());
    }

    private Outcome pay(String txnId, String account, String sum, String txnDate) {
        BigDecimal amount = parseSum(sum);
        if (amount == null) {
            return Outcome.of(5, "Invalid sum");
        }
        Invoice invoice;
        try {
            invoice = resolveInvoice(account);
        } catch (BadRequestException e) {
            return Outcome.of(2, "Invalid account");
        } catch (ResourceNotFoundException e) {
            return Outcome.of(3, "Account not found");
        }
        Outcome base = Outcome.of(0, "OK").withInvoice(invoice.getId()).withParsedSum(amount);
        if (invoice.getAmount().compareTo(amount) != 0) {
            log.warn("Kaspi pay txn {} amount mismatch for invoice {}", txnId, invoice.getId());
            return Outcome.of(4, "Amount does not match invoice").withInvoice(invoice.getId()).withParsedSum(amount);
        }
        try {
            OnlinePaymentSettlementService.Settlement s =
                    settlement.settle(PaymentProvider.KASPI, txnId, invoice.getId(), amount, "KZT");
            return base.withPrv(String.valueOf(s.paymentId()), amount.toPlainString());
        } catch (ConflictException e) {
            // Includes "already paid" and provider-id reuse. Kaspi must treat this as a refusal.
            log.error("Kaspi pay txn {} refused for invoice {}: {}", txnId, invoice.getId(), e.getMessage());
            return Outcome.of(4, "Payment not possible").withInvoice(invoice.getId()).withParsedSum(amount);
        } catch (RuntimeException e) {
            log.error("Kaspi pay txn {} failed for invoice {}", txnId, invoice.getId(), e);
            // Temporary error: Kaspi retries; nothing was stored so the retry is evaluated afresh.
            throw new TemporaryFailure(txnId, e);
        }
    }

    private Invoice resolveInvoice(String account) {
        if (account == null || !ACCOUNT.matcher(account.trim()).matches()) {
            throw new BadRequestException("Invalid account");
        }
        long id;
        try {
            id = Long.parseLong(account.trim());
        } catch (NumberFormatException e) {
            throw new BadRequestException("Invalid account");
        }
        return invoices.findById(id).orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    private boolean isPayable(Invoice invoice) {
        return (invoice.getStatus() == Invoice.InvoiceStatus.ISSUED || invoice.getStatus() == Invoice.InvoiceStatus.OVERDUE)
                && !onlinePayments.existsByInvoiceId(invoice.getId());
    }

    private static BigDecimal parseSum(String sum) {
        if (sum == null) return null;
        try {
            BigDecimal v = new BigDecimal(sum.trim());
            if (v.signum() <= 0 || v.scale() > 2 || v.precision() > 12) return null;
            return v;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String sanitize(String s) {
        return truncate(s.replaceAll("[^A-Za-z0-9_-]", ""), 32);
    }

    static String xml(String txnId, int code, String prvTxnId, String sum, String comment) {
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><response>");
        sb.append("<osmp_txn_id>").append(txnId).append("</osmp_txn_id>");
        if (prvTxnId != null) sb.append("<prv_txn_id>").append(prvTxnId).append("</prv_txn_id>");
        if (sum != null) sb.append("<sum>").append(sum).append("</sum>");
        sb.append("<result>").append(code).append("</result>");
        sb.append("<comment>").append(comment == null ? "" : comment).append("</comment>");
        return sb.append("</response>").toString();
    }

    public static String temporaryErrorXml(String txnId) {
        return xml(txnId == null ? "" : sanitize(txnId), 1, null, null, "Temporary error, retry later");
    }

    /** Signals a retryable failure; the controller turns it into result code 1. */
    public static class TemporaryFailure extends RuntimeException {
        private final String txnId;
        TemporaryFailure(String txnId, Throwable cause) {
            super("Temporary failure for txn " + txnId, cause);
            this.txnId = txnId;
        }
        public String getTxnId() { return txnId; }
    }

    private static final class Outcome {
        final int code;
        final String comment;
        Long invoiceId;
        BigDecimal parsedSum;
        String prvTxnId;
        String sum;

        private Outcome(int code, String comment) { this.code = code; this.comment = comment; }
        static Outcome of(int code, String comment) { return new Outcome(code, comment); }
        Outcome withInvoice(Long id) { this.invoiceId = id; return this; }
        Outcome withParsedSum(BigDecimal v) { this.parsedSum = v; return this; }
        Outcome withPrv(String prv, String sum) { this.prvTxnId = prv; this.sum = sum; return this; }
    }
}
