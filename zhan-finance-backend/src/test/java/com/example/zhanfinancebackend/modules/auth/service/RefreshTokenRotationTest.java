package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.entity.RefreshToken;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RefreshTokenRotationTest {

    private RefreshTokenService refreshTokenService;
    private RefreshTokenRepository refreshTokenRepository;
    private User testUser;

    @BeforeEach
    void setUp() {
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        refreshTokenService = new RefreshTokenService(refreshTokenRepository, 86400000L); // 1 day

        testUser = new User();
        testUser.setId(10L);
        testUser.setEmail("user@example.com");
    }

    @Test
    @DisplayName("create() сохраняет новый токен с familyId и сохраняет параллельные сессии (до 5 устройств)")
    void create_SavesNewTokenAndPreservesConcurrentSessionsBelowLimit() {
        RefreshToken tokenToReturn = new RefreshToken("new-token-uuid", testUser, UUID.randomUUID().toString(), Instant.now().plusSeconds(3600));
        tokenToReturn.setId(100L);

        when(refreshTokenRepository.findActiveByUserOrderByCreatedAtAsc(eq(testUser), any(Instant.class)))
                .thenReturn(List.of());
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(tokenToReturn);

        RefreshToken result = refreshTokenService.create(testUser);

        assertNotNull(result);
        assertEquals("new-token-uuid", result.getToken());
        assertNotNull(result.getFamilyId());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(refreshTokenRepository, never()).revokeByFamilyId(any(), any());
    }

    @Test
    @DisplayName("create() при превышении лимита 5 активных сессий отзывает самую старую сессию")
    void create_WhenExceedingMaxSessions_RevokesOldestFamily() {
        Instant now = Instant.now();
        List<RefreshToken> fiveActive = List.of(
                new RefreshToken("t1", testUser, "fam-oldest", now.plusSeconds(3600)),
                new RefreshToken("t2", testUser, "fam-2", now.plusSeconds(3600)),
                new RefreshToken("t3", testUser, "fam-3", now.plusSeconds(3600)),
                new RefreshToken("t4", testUser, "fam-4", now.plusSeconds(3600)),
                new RefreshToken("t5", testUser, "fam-5", now.plusSeconds(3600))
        );

        when(refreshTokenRepository.findActiveByUserOrderByCreatedAtAsc(eq(testUser), any(Instant.class)))
                .thenReturn(fiveActive);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken result = refreshTokenService.create(testUser);

        assertNotNull(result);
        verify(refreshTokenRepository).revokeByFamilyId(eq("fam-oldest"), any(Instant.class));
        verify(refreshTokenRepository, never()).revokeByFamilyId(eq("fam-2"), any(Instant.class));
    }

    @Test
    @DisplayName("rotate() отзывает старый токен и возвращает новый токен в той же семье")
    void rotate_ValidToken_RevokesOldAndReturnsNewTokenInSameFamily() {
        String familyId = UUID.randomUUID().toString();
        RefreshToken validToken = new RefreshToken("valid-token", testUser, familyId, Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(validToken));
        
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshToken result = refreshTokenService.rotate("valid-token");

        assertNotNull(result);
        assertNotEquals("valid-token", result.getToken());
        assertEquals(familyId, result.getFamilyId());
        assertEquals(testUser, result.getUser());
        assertTrue(validToken.isRevoked());
        assertNotNull(validToken.getRevokedAt());
    }

    @Test
    @DisplayName("rotate() при обнаружении повторного использования (Token Reuse) отзывает всю семью токенов")
    void rotate_RevokedToken_TriggersReuseDetectionAndRevokesFamily() {
        String familyId = UUID.randomUUID().toString();
        RefreshToken revokedToken = new RefreshToken("already-used-token", testUser, familyId, Instant.now().plusSeconds(3600));
        revokedToken.setRevoked(true);
        revokedToken.setRevokedAt(Instant.now().minusSeconds(60));

        when(refreshTokenRepository.findByToken("already-used-token")).thenReturn(Optional.of(revokedToken));

        UnauthorizedException exception = assertThrows(
                UnauthorizedException.class,
                () -> refreshTokenService.rotate("already-used-token")
        );

        assertTrue(exception.getMessage().contains("Compromised refresh token reused"));
        verify(refreshTokenRepository).revokeByFamilyId(eq(familyId), any(Instant.class));
    }

    @Test
    @DisplayName("rotate() в пределах grace period (15 сек) возвращает активный токен без сброса сессии")
    void rotate_RevokedToken_WithinGracePeriod_ReturnsActiveToken() {
        String familyId = UUID.randomUUID().toString();
        RefreshToken revokedToken = new RefreshToken("recently-used-token", testUser, familyId, Instant.now().plusSeconds(3600));
        revokedToken.setRevoked(true);
        revokedToken.setRevokedAt(Instant.now().minusSeconds(5));

        RefreshToken activeToken = new RefreshToken("active-token", testUser, familyId, Instant.now().plusSeconds(3600));

        when(refreshTokenRepository.findByToken("recently-used-token")).thenReturn(Optional.of(revokedToken));
        when(refreshTokenRepository.findActiveByFamilyId(familyId)).thenReturn(java.util.List.of(activeToken));

        RefreshToken result = refreshTokenService.rotate("recently-used-token");

        assertNotNull(result);
        assertEquals("active-token", result.getToken());
        assertEquals(familyId, result.getFamilyId());
        verify(refreshTokenRepository, never()).revokeByFamilyId(any(), any());
    }

    @Test
    @DisplayName("rotate() выбрасывает UnauthorizedException если токен истёк")
    void rotate_ExpiredToken_ThrowsUnauthorizedException() {
        String familyId = UUID.randomUUID().toString();
        RefreshToken expiredToken = new RefreshToken("expired-token", testUser, familyId, Instant.now().minusSeconds(10));
        when(refreshTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(expiredToken));

        assertThrows(UnauthorizedException.class, () -> refreshTokenService.rotate("expired-token"));
    }

    @Test
    @DisplayName("rotate() выбрасывает UnauthorizedException если токен не найден в базе")
    void rotate_UnknownToken_ThrowsUnauthorizedException() {
        when(refreshTokenRepository.findByToken("unknown-token")).thenReturn(Optional.empty());

        assertThrows(UnauthorizedException.class, () -> refreshTokenService.rotate("unknown-token"));
    }
}
