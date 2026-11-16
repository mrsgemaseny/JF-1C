package com.example.zhanfinancebackend.modules.billing.entity;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A provider-confirmed, settled online payment. One row per invoice: the ledger is the
 * single source of truth for "this invoice was paid online", regardless of provider.
 */
@Entity
@Table(name = "online_payments", uniqueConstraints = {
        @UniqueConstraint(name = "online_payments_provider_payment_uq", columnNames = {"provider", "provider_payment_id"})
})
public class OnlinePayment extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private PaymentProvider provider;

    @Column(name = "provider_payment_id", nullable = false, length = 128, updatable = false)
    private String providerPaymentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false, unique = true, updatable = false)
    private Invoice invoice;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(name = "paid_at", nullable = false, updatable = false)
    private Instant paidAt;

    protected OnlinePayment() {}

    public OnlinePayment(PaymentProvider provider, String providerPaymentId, Invoice invoice, BigDecimal amount) {
        this.provider = provider;
        this.providerPaymentId = providerPaymentId;
        this.invoice = invoice;
        this.amount = amount;
        this.currency = "KZT";
        this.paidAt = Instant.now();
    }

    public PaymentProvider getProvider() { return provider; }
    public String getProviderPaymentId() { return providerPaymentId; }
    public Invoice getInvoice() { return invoice; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public Instant getPaidAt() { return paidAt; }
}
