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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshTokenExpirationMs;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    @Transactional
    public RefreshToken create(User user) {
        String familyId = UUID.randomUUID().toString();
        RefreshToken newToken = new RefreshToken(
                UUID.randomUUID().toString(),
                user,
                familyId,
                Instant.now().plusMillis(refreshTokenExpirationMs)
        );
        RefreshToken saved = refreshTokenRepository.save(newToken);
        refreshTokenRepository.deleteAllByUserExceptId(user, saved.getId());
        return saved;
    }

    /**
     * Выполняет безопасную ротацию токена в рамках одной семьи (Token Family).
     * При попытке повторного использования уже отозванного токена (Token Reuse Attack)
     * немедленно отзывает всю семью токенов пользователя и прерывает сессию.
     */
    @Transactional
    public RefreshToken rotate(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenForUpdate(rawToken)
                .or(() -> refreshTokenRepository.findByToken(rawToken))
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
                        log.info("Grace period active for recently rotated token (family: {}). Returning active token.",
                                token.getFamilyId());
                        return activeToken;
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
        RefreshToken newToken = new RefreshToken(
                UUID.randomUUID().toString(),
                token.getUser(),
                token.getFamilyId(),
                Instant.now().plusMillis(refreshTokenExpirationMs)
        );
        return refreshTokenRepository.save(newToken);
    }

    @Transactional
    public RefreshToken verify(String token) {
        return rotate(token);
    }

    @Transactional
    public void revoke(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> {
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
