package com.example.zhanfinancebackend.modules.billing.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.billing.entity.Invoice;
import com.example.zhanfinancebackend.modules.billing.entity.KaspiPayment;
import com.example.zhanfinancebackend.modules.billing.repository.InvoiceRepository;
import com.example.zhanfinancebackend.modules.billing.repository.KaspiPaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/** Records a provider-verified payment. Never call this with client-supplied payment status. */
@Service
public class KaspiPaymentLedgerService {
    private static final Logger log = LoggerFactory.getLogger(KaspiPaymentLedgerService.class);
    private final InvoiceRepository invoices;
    private final KaspiPaymentRepository payments;

    public KaspiPaymentLedgerService(InvoiceRepository invoices, KaspiPaymentRepository payments) {
        this.invoices = invoices;
        this.payments = payments;
    }

    @Transactional
    public KaspiPayment recordConfirmedPayment(String providerPaymentId, Long invoiceId, BigDecimal amount,
                                                String currency) {
        if (providerPaymentId == null || providerPaymentId.isBlank() || providerPaymentId.length() > 128
                || invoiceId == null || amount == null || amount.signum() <= 0 || amount.scale() > 2
                || !"KZT".equals(currency)) {
            throw new BadRequestException("Invalid confirmed payment data");
        }

        // Lock the invoice first: concurrent callbacks for this invoice serialize here.
        Invoice invoice = invoices.findByIdForPaymentUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        KaspiPayment existing = payments.findByProviderPaymentId(providerPaymentId).orElse(null);
        if (existing != null) {
            if (!existing.getInvoice().getId().equals(invoiceId)
                    || existing.getAmount().compareTo(amount) != 0 || !existing.getCurrency().equals(currency)) {
                log.warn("Provider payment ID reuse conflicts with invoice {}", invoiceId);
                throw new ConflictException("Provider payment ID was reused with different data");
            }
            log.info("Returning existing Kaspi payment for invoice {}", invoiceId);
            return existing;
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

        KaspiPayment payment = payments.saveAndFlush(new KaspiPayment(providerPaymentId, invoice, amount));
        invoice.setStatus(Invoice.InvoiceStatus.PAID);
        invoices.save(invoice);
        log.info("Recorded confirmed Kaspi payment {} for invoice {}", payment.getId(), invoiceId);
        return payment;
    }
}
