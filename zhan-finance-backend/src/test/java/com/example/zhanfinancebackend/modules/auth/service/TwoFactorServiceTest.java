package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.dto.TwoFactorSetupDto;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.TwoFactorPreAuth;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.TwoFactorPreAuthRepository;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TwoFactorServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TwoFactorPreAuthRepository preAuthRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private TwoFactorService twoFactorService;

    private User testUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = new User("Admin User", "admin@zhanfinance.kz", "hashedpass", Role.ADMIN);
        testUser.setId(1L);
    }

    @Test
    void generateSetup_ReturnsSetupDtoWithSecretAndQrCode() {
        TwoFactorSetupDto setupDto = twoFactorService.generateSetup(testUser);

        assertNotNull(setupDto);
        assertNotNull(setupDto.secret());
        assertTrue(setupDto.qrCodeImage().startsWith("data:image/png;base64,"));
        assertTrue(setupDto.uri().contains("ZhanFinance"));
    }

    @Test
    void createPreAuthToken_SavesAndReturnsToken() {
        when(preAuthRepository.save(any(TwoFactorPreAuth.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String token = twoFactorService.createPreAuthToken(testUser);

        assertNotNull(token);
        verify(preAuthRepository).deleteByUser(testUser);
        verify(preAuthRepository).save(any(TwoFactorPreAuth.class));
    }

    @Test
    void verifyCode_ExpiredToken_ThrowsUnauthorizedException() {
        TwoFactorPreAuth preAuth = new TwoFactorPreAuth();
        preAuth.setUser(testUser);
        preAuth.setToken("expired-token");
        preAuth.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(preAuthRepository.findByToken("expired-token")).thenReturn(Optional.of(preAuth));

        assertThrows(UnauthorizedException.class, () -> twoFactorService.verifyCode("expired-token", "123456"));
        verify(preAuthRepository).delete(preAuth);
    }

    @Test
    void verifyCode_MaxAttemptsReached_DeletesTokenAndThrows() {
        TwoFactorPreAuth preAuth = new TwoFactorPreAuth();
        preAuth.setUser(testUser);
        preAuth.setToken("max-attempts-token");
        preAuth.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        preAuth.setAttempts(5);

        testUser.setTotpSecret("SECRET");

        when(preAuthRepository.findByToken("max-attempts-token")).thenReturn(Optional.of(preAuth));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        assertThrows(UnauthorizedException.class, () -> twoFactorService.verifyCode("max-attempts-token", "000000"));
        verify(preAuthRepository).delete(preAuth);
    }

    @Test
    void verifyCode_InvalidCode_IncrementsAttemptsAndThrows() {
        TwoFactorPreAuth preAuth = new TwoFactorPreAuth();
        preAuth.setUser(testUser);
        preAuth.setToken("invalid-code-token");
        preAuth.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        preAuth.setAttempts(0);

        testUser.setTotpSecret("SECRET");

        when(preAuthRepository.findByToken("invalid-code-token")).thenReturn(Optional.of(preAuth));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        assertThrows(UnauthorizedException.class, () -> twoFactorService.verifyCode("invalid-code-token", "000000"));
        
        assertEquals(1, preAuth.getAttempts());
        verify(preAuthRepository).save(preAuth);
    }

    @Test
    void confirmSetup_InvalidCode_ThrowsBadRequestException() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        assertThrows(BadRequestException.class, () -> 
            twoFactorService.confirmSetup(testUser, "JBSWY3DPEHPK3PXP", "000000")
        );
    }

    @Test
    void confirmSetup_WhenAlreadyEnabled_ThrowsBadRequestException() {
        testUser.setTwoFactorEnabled(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        assertThrows(BadRequestException.class, () -> 
            twoFactorService.confirmSetup(testUser, "JBSWY3DPEHPK3PXP", "123456")
        );
    }

    @Test
    void getUserForPreAuthSetup_WhenAlreadyEnabled_ThrowsBadRequestException() {
        testUser.setTwoFactorEnabled(true);
        TwoFactorPreAuth preAuth = new TwoFactorPreAuth();
        preAuth.setUser(testUser);
        preAuth.setToken("preauth-token");
        preAuth.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(preAuthRepository.findByToken("preauth-token")).thenReturn(Optional.of(preAuth));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        assertThrows(BadRequestException.class, () ->
            twoFactorService.getUserForPreAuthSetup("preauth-token")
        );
    }

    @Test
    void confirmSetupWithPreAuth_WhenAlreadyEnabled_ThrowsBadRequestException() {
        testUser.setTwoFactorEnabled(true);
        TwoFactorPreAuth preAuth = new TwoFactorPreAuth();
        preAuth.setUser(testUser);
        preAuth.setToken("preauth-token");
        preAuth.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(preAuthRepository.findByToken("preauth-token")).thenReturn(Optional.of(preAuth));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        assertThrows(BadRequestException.class, () ->
            twoFactorService.confirmSetupWithPreAuth("preauth-token", "JBSWY3DPEHPK3PXP", "123456")
        );
    }
}
