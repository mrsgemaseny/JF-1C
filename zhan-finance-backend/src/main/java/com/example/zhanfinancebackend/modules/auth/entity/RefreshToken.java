package com.example.zhanfinancebackend.modules.auth.entity;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken extends BaseEntity {

    /**
     * SHA-256 hex digest of the raw refresh token. The raw value is never persisted:
     * a database dump must not be convertible into live sessions.
     */
    @Column(nullable = false, unique = true, length = 80)
    private String token;

    /** Raw token value, available only on the instance that issued it. */
    @jakarta.persistence.Transient
    private String rawToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "family_id", nullable = false, length = 64)
    private String familyId;

    @Column(name = "is_revoked", nullable = false)
    private boolean isRevoked = false;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(nullable = false)
    private Instant expiresAt;

    protected RefreshToken() {
    }

    public RefreshToken(String token, User user, String familyId, Instant expiresAt) {
        this.token = token;
        this.user = user;
        this.familyId = familyId != null ? familyId : UUID.randomUUID().toString();
        this.expiresAt = expiresAt;
        this.isRevoked = false;
    }

    public RefreshToken(String token, User user, Instant expiresAt) {
        this(token, user, UUID.randomUUID().toString(), expiresAt);
    }

    /** Stored digest. Use {@link #getRawToken()} for the value handed to the client. */
    public String getToken() {
        return token;
    }

    public String getRawToken() {
        return rawToken;
    }

    public void setRawToken(String rawToken) {
        this.rawToken = rawToken;
    }

    public User getUser() {
        return user;
    }

    public String getFamilyId() {
        return familyId;
    }

    public void setFamilyId(String familyId) {
        this.familyId = familyId;
    }

    public boolean isRevoked() {
        return isRevoked;
    }

    public void setRevoked(boolean revoked) {
        isRevoked = revoked;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
