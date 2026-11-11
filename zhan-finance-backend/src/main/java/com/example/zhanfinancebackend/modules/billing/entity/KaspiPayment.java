package com.example.zhanfinancebackend.modules.billing.entity;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "kaspi_payments")
public class KaspiPayment extends BaseEntity {
    @Column(name = "provider_payment_id", nullable = false, unique = true, length = 128, updatable = false)
    private String providerPaymentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false, unique = true, updatable = false)
    private Invoice invoice;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    protected KaspiPayment() {}

    public KaspiPayment(String providerPaymentId, Invoice invoice, BigDecimal amount) {
        this.providerPaymentId = providerPaymentId;
        this.invoice = invoice;
        this.amount = amount;
        this.currency = "KZT";
    }

    public String getProviderPaymentId() { return providerPaymentId; }
    public Invoice getInvoice() { return invoice; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
}
