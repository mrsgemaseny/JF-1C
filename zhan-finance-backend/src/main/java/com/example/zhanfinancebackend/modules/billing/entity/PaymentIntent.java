package com.example.zhanfinancebackend.modules.billing.entity;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One client-initiated attempt to pay an invoice through a redirect provider. The amount is
 * fixed from the invoice at creation; a provider callback is only accepted if it matches it.
 */
@Entity
@Table(name = "payment_intents")
public class PaymentIntent extends BaseEntity {

    public enum Status { CREATED, REDIRECTED, PAID, FAILED, EXPIRED }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private PaymentProvider provider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false, updatable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false, updatable = false)
    private User client;

    @Column(name = "merchant_order_id", nullable = false, length = 64, updatable = false, unique = true)
    private String merchantOrderId;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency = "KZT";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.CREATED;

    @Column(name = "provider_payment_id", length = 64)
    private String providerPaymentId;

    @Column(name = "redirect_url", columnDefinition = "TEXT")
    private String redirectUrl;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    protected PaymentIntent() {}

    public PaymentIntent(PaymentProvider provider, Invoice invoice, User client, String merchantOrderId,
                         BigDecimal amount, Instant expiresAt) {
        this.provider = provider;
        this.invoice = invoice;
        this.client = client;
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired(Instant now) { return !expiresAt.isAfter(now); }

    public void markRedirected(String providerPaymentId, String redirectUrl) {
        this.status = Status.REDIRECTED;
        this.providerPaymentId = providerPaymentId;
        this.redirectUrl = redirectUrl;
    }

    public void markPaid(String providerPaymentId) {
        this.status = Status.PAID;
        this.providerPaymentId = providerPaymentId;
        this.failureReason = null;
    }

    public void markFailed(String reason) {
        this.status = Status.FAILED;
        this.failureReason = reason == null ? null : reason.substring(0, Math.min(reason.length(), 500));
    }

    public void markExpired() { this.status = Status.EXPIRED; }

    public PaymentProvider getProvider() { return provider; }
    public Invoice getInvoice() { return invoice; }
    public User getClient() { return client; }
    public String getMerchantOrderId() { return merchantOrderId; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public Status getStatus() { return status; }
    public String getProviderPaymentId() { return providerPaymentId; }
    public String getRedirectUrl() { return redirectUrl; }
    public String getFailureReason() { return failureReason; }
    public Instant getExpiresAt() { return expiresAt; }
}
