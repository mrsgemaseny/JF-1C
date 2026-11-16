package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.OnlinePayment;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.OnlinePaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Records a provider-verified payment against an invoice. Callers must have verified the
 * payment with the provider (signed callback plus server-side status check, or a request
 * from the provider's own network). Never call this with client-supplied payment status.
 */
@Service
public class OnlinePaymentLedgerService {
    private static final Logger log = LoggerFactory.getLogger(OnlinePaymentLedgerService.class);
    private final InvoiceRepository invoices;
    private final OnlinePaymentRepository payments;

    public OnlinePaymentLedgerService(InvoiceRepository invoices, OnlinePaymentRepository payments) {
        this.invoices = invoices;
        this.payments = payments;
    }

    public record Result(OnlinePayment payment, boolean newlyRecorded) {}

    @Transactional
    public Result recordConfirmedPayment(PaymentProvider provider, String providerPaymentId, Long invoiceId,
                                         BigDecimal amount, String currency) {
        if (provider == null || providerPaymentId == null || providerPaymentId.isBlank() || providerPaymentId.length() > 128
                || invoiceId == null || amount == null || amount.signum() <= 0 || amount.scale() > 2
                || !"KZT".equals(currency)) {
            throw new BadRequestException("Invalid confirmed payment data");
        }

        // Lock the invoice first: concurrent callbacks for this invoice serialize here.
        Invoice invoice = invoices.findByIdForPaymentUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        OnlinePayment existing = payments.findByProviderAndProviderPaymentId(provider, providerPaymentId).orElse(null);
        if (existing != null) {
            if (!existing.getInvoice().getId().equals(invoiceId)
                    || existing.getAmount().compareTo(amount) != 0 || !existing.getCurrency().equals(currency)) {
                log.warn("{} payment id reuse conflicts with invoice {}", provider, invoiceId);
                throw new ConflictException("Provider payment ID was reused with different data");
            }
            log.info("Returning existing {} payment for invoice {}", provider, invoiceId);
            return new Result(existing, false);
        }
        if (payments.existsByInvoiceId(invoiceId) || invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
            throw new ConflictException("Invoice already paid");
        }
        if (invoice.getStatus() != Invoice.InvoiceStatus.ISSUED
                && invoice.getStatus() != Invoice.InvoiceStatus.OVERDUE) {
            throw new ConflictException("Invoice is not payable");
        }
        if (invoice.getAmount().compareTo(amount) != 0) {
            throw new ConflictException("Payment amount does not match invoice");
        }

        OnlinePayment payment = payments.saveAndFlush(new OnlinePayment(provider, providerPaymentId, invoice, amount));
        invoice.setStatus(Invoice.InvoiceStatus.PAID);
        invoices.save(invoice);
        log.info("Recorded confirmed {} payment {} for invoice {}", provider, payment.getId(), invoiceId);
        return new Result(payment, true);
    }
}
