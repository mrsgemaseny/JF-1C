package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.entity.RefreshToken;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    public static final int MAX_ACTIVE_SESSIONS_PER_USER = 5;

    private static final int RAW_TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshTokenExpirationMs;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    @Transactional
    public RefreshToken create(User user) {
        Instant now = Instant.now();
        List<RefreshToken> activeTokens = refreshTokenRepository.findActiveByUserOrderByCreatedAtAsc(user, now);
        if (activeTokens.size() >= MAX_ACTIVE_SESSIONS_PER_USER) {
            int sessionsToRevoke = activeTokens.size() - MAX_ACTIVE_SESSIONS_PER_USER + 1;
            for (int i = 0; i < sessionsToRevoke; i++) {
                RefreshToken oldest = activeTokens.get(i);
                refreshTokenRepository.revokeByFamilyId(oldest.getFamilyId(), now);
            }
        }

        return issue(user, UUID.randomUUID().toString(), now.plusMillis(refreshTokenExpirationMs));
    }

    /** Persists the digest, returns the entity carrying the raw value for the client. */
    private RefreshToken issue(User user, String familyId, Instant expiresAt) {
        String raw = generateRawToken();
        RefreshToken token = new RefreshToken(hash(raw), user, familyId, expiresAt);
        RefreshToken saved = refreshTokenRepository.save(token);
        saved.setRawToken(raw);
        return saved;
    }

    private String generateRawToken() {
        byte[] bytes = new byte[RAW_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /**
     * Выполняет безопасную ротацию токена в рамках одной семьи (Token Family).
     * При попытке повторного использования уже отозванного токена (Token Reuse Attack)
     * немедленно отзывает всю семью токенов пользователя и прерывает сессию.
     */
    @Transactional
    public RefreshToken rotate(String rawToken) {
        String tokenHash = hash(rawToken);
        RefreshToken token = refreshTokenRepository.findByTokenForUpdate(tokenHash)
                .or(() -> refreshTokenRepository.findByToken(tokenHash))
                .orElseThrow(() -> {
                    log.warn("Refresh token not found: {}",
                            rawToken != null && rawToken.length() > 8 ? rawToken.substring(0, 8) + "..." : rawToken);
                    return new UnauthorizedException("Invalid refresh token");
                });


        if (token.isRevoked()) {
            // Grace Period per RFC 6819 Section 5.2.2.3: allow a 15-second window for concurrent requests from multiple tabs
            Instant revokedAt = token.getRevokedAt();
            if (revokedAt != null && revokedAt.isAfter(Instant.now().minusSeconds(15))) {
                List<RefreshToken> activeTokens = refreshTokenRepository.findActiveByFamilyId(token.getFamilyId());
                if (!activeTokens.isEmpty()) {
                    RefreshToken activeToken = activeTokens.get(0);
                    if (activeToken.getExpiresAt().isAfter(Instant.now())) {
                        // Only digests are stored, so the concurrently issued raw token cannot be
                        // handed back; issue one more token in the same family instead. The family
                        // stays a single revocation unit.
                        log.info("Grace period active for recently rotated token (family: {}). Issuing sibling token.",
                                token.getFamilyId());
                        return issue(token.getUser(), token.getFamilyId(), Instant.now().plusMillis(refreshTokenExpirationMs));
                    }
                }
            }

            log.warn("CRITICAL: Token reuse detected! Family: {}, User: {}. Revoking all tokens in family.",
                    token.getFamilyId(), token.getUser() != null ? token.getUser().getId() : "null");
            refreshTokenRepository.revokeByFamilyId(token.getFamilyId(), Instant.now());
            throw new UnauthorizedException("Compromised refresh token reused. Session terminated.");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token expired");
        }

        // Помечаем текущий токен использованным/отозванным
        token.setRevoked(true);
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);

        // Выпускаем новый токен в той же цепочке семьи
        return issue(token.getUser(), token.getFamilyId(), Instant.now().plusMillis(refreshTokenExpirationMs));
    }

    @Transactional
    public RefreshToken verify(String token) {
        return rotate(token);
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByToken(hash(rawToken)).ifPresent(rt -> {
            refreshTokenRepository.revokeByFamilyId(rt.getFamilyId(), Instant.now());
        });
    }

    /**
     * Принудительная инвалидация всех сессий пользователя.
     * Вызывается при смене пароля, подозрении на компрометацию, выходе со всех устройств.
     */
    @Transactional
    public void revokeAll(User user) {
        int count = refreshTokenRepository.revokeAllByUser(user, Instant.now());
        log.info("Revoked {} refresh tokens for user {}", count, user.getId());
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 2 * * ?") // Every day at 2 AM
    @Transactional
    public void purgeExpiredTokens() {
        Instant now = Instant.now();
        Instant purgeRevokedBefore = now.minus(7, ChronoUnit.DAYS);
        int deleted = refreshTokenRepository.deleteExpiredAndRevokedTokens(now, purgeRevokedBefore);
        if (deleted > 0) {
            log.info("Purged {} expired/revoked refresh tokens from the database", deleted);
        }
    }
}
