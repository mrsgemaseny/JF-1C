package com.example.zhanfinancebackend.modules.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Audit log and replay cache for Kaspi provider callbacks. (txn_id, command) is unique, so a
 * retried callback gets the stored response instead of being processed again.
 */
@Entity
@Table(name = "kaspi_callbacks")
public class KaspiCallback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "txn_id", nullable = false, length = 32, updatable = false)
    private String txnId;

    @Column(nullable = false, length = 8, updatable = false)
    private String command;

    @Column(nullable = false, length = 200, updatable = false)
    private String account;

    @Column(precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "txn_date", length = 14, updatable = false)
    private String txnDate;

    @Column(name = "invoice_id", updatable = false)
    private Long invoiceId;

    @Column(name = "result_code", nullable = false, updatable = false)
    private int resultCode;

    @Column(name = "prv_txn_id", length = 40, updatable = false)
    private String prvTxnId;

    @Column(name = "response_body", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String responseBody;

    @Column(name = "client_ip", length = 64, updatable = false)
    private String clientIp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected KaspiCallback() {}

    public KaspiCallback(String txnId, String command, String account, BigDecimal amount, String txnDate,
                         Long invoiceId, int resultCode, String prvTxnId, String responseBody, String clientIp) {
        this.txnId = txnId;
        this.command = command;
        this.account = account;
        this.amount = amount;
        this.txnDate = txnDate;
        this.invoiceId = invoiceId;
        this.resultCode = resultCode;
        this.prvTxnId = prvTxnId;
        this.responseBody = responseBody;
        this.clientIp = clientIp;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getTxnId() { return txnId; }
    public String getCommand() { return command; }
    public int getResultCode() { return resultCode; }
    public String getResponseBody() { return responseBody; }
}
