package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.dto.TwoFactorSetupDto;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.TwoFactorPreAuth;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.TwoFactorPreAuthRepository;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class TwoFactorService {

    private final SecretGenerator secretGenerator;
    private final QrGenerator qrGenerator;
    private final CodeVerifier codeVerifier;
    private final UserRepository userRepository;
    private final TwoFactorPreAuthRepository preAuthRepository;
    private final RefreshTokenService refreshTokenService;

    public TwoFactorService(
            UserRepository userRepository,
            TwoFactorPreAuthRepository preAuthRepository,
            RefreshTokenService refreshTokenService
    ) {
        this.userRepository = userRepository;
        this.preAuthRepository = preAuthRepository;
        this.refreshTokenService = refreshTokenService;
        this.secretGenerator = new DefaultSecretGenerator();
        this.qrGenerator = new ZxingPngQrGenerator();

        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator(HashingAlgorithm.SHA1);
        this.codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
    }

    @Transactional(readOnly = true)
    public TwoFactorSetupDto generateSetup(User user) {
        String secret = secretGenerator.generate();

        QrData qrData = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer("ZhanFinance")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        String qrImageBase64;
        try {
            byte[] imageData = qrGenerator.generate(qrData);
            qrImageBase64 = "data:image/png;base64," + Base64.getEncoder().encodeToString(imageData);
        } catch (QrGenerationException e) {
            throw new BadRequestException("Ошибка генерации QR-кода");
        }

        return new TwoFactorSetupDto(secret, qrImageBase64, qrData.getUri());
    }

    @Transactional
    public void confirmSetup(User user, String secret, String code) {
        User persistentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BadRequestException("Пользователь не найден"));
        if (persistentUser.isTwoFactorEnabled()) {
            throw new BadRequestException("Двухфакторная аутентификация уже настроена");
        }
        if (!codeVerifier.isValidCode(secret, code)) {
            throw new BadRequestException("Неверный код подтверждения 2FA");
        }
        persistentUser.setTotpSecret(secret);
        persistentUser.setTwoFactorEnabled(true);
        userRepository.save(persistentUser);
    }

    @Transactional
    public void disable2FA(User user, String code) {
        User persistentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BadRequestException("Пользователь не найден"));
        if (persistentUser.getRole() == Role.ADMIN) {
            throw new BadRequestException("Отключение двухфакторной аутентификации запрещено для администратора");
        }
        if (!persistentUser.isTwoFactorEnabled()) {
            throw new BadRequestException("Двухфакторная аутентификация не включена");
        }
        if (!codeVerifier.isValidCode(persistentUser.getTotpSecret(), code)) {
            throw new BadRequestException("Неверный код подтверждения");
        }
        persistentUser.setTotpSecret(null);
        persistentUser.setTwoFactorEnabled(false);
        userRepository.save(persistentUser);
    }

    @Transactional(readOnly = true)
    public User getUserByPreAuthToken(String token) {
        TwoFactorPreAuth preAuth = preAuthRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Недействительный токен 2FA"));
        if (preAuth.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Срок действия токена 2FA истек. Войдите заново.");
        }
        return userRepository.findById(preAuth.getUser().getId())
                .orElseThrow(() -> new UnauthorizedException("Пользователь не найден"));
    }

    @Transactional(readOnly = true)
    public User getUserForPreAuthSetup(String token) {
        User user = getUserByPreAuthToken(token);
        if (user.isTwoFactorEnabled()) {
            throw new BadRequestException("Двухфакторная аутентификация уже настроена");
        }
        return user;
    }

    @Transactional
    public User confirmSetupWithPreAuth(String token, String secret, String code) {
        TwoFactorPreAuth preAuth = preAuthRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Недействительный токен 2FA"));

        if (preAuth.getExpiresAt().isBefore(LocalDateTime.now())) {
            preAuthRepository.delete(preAuth);
            throw new UnauthorizedException("Срок действия токена 2FA истек. Войдите заново.");
        }

        User user = userRepository.findById(preAuth.getUser().getId())
                .orElseThrow(() -> new UnauthorizedException("Пользователь не найден"));

        if (user.isTwoFactorEnabled()) {
            throw new BadRequestException("Двухфакторная аутентификация уже настроена");
        }

        if (preAuth.getAttempts() >= 5) {
            preAuthRepository.delete(preAuth);
            throw new UnauthorizedException("Превышен лимит попыток. Войдите заново.");
        }

        if (!codeVerifier.isValidCode(secret, code)) {
            preAuth.setAttempts(preAuth.getAttempts() + 1);
            preAuthRepository.save(preAuth);
            if (preAuth.getAttempts() >= 5) {
                preAuthRepository.delete(preAuth);
                throw new UnauthorizedException("Превышен лимит попыток. Войдите заново.");
            }
            throw new BadRequestException("Неверный код подтверждения 2FA");
        }

        User persistentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BadRequestException("Пользователь не найден"));
        persistentUser.setTotpSecret(secret);
        persistentUser.setTwoFactorEnabled(true);
        userRepository.save(persistentUser);

        refreshTokenService.revokeAll(persistentUser);
        return persistentUser;
    }

    @Transactional
    public String createPreAuthToken(User user) {
        preAuthRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString();
        TwoFactorPreAuth preAuth = new TwoFactorPreAuth();
        preAuth.setUser(user);
        preAuth.setToken(token);
        preAuth.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        preAuth.setCreatedAt(LocalDateTime.now());
        preAuthRepository.save(preAuth);

        return token;
    }

    @Transactional
    public User verifyCode(String token, String code) {
        TwoFactorPreAuth preAuth = preAuthRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Недействительный токен 2FA"));

        if (preAuth.getExpiresAt().isBefore(LocalDateTime.now())) {
            preAuthRepository.delete(preAuth);
            throw new UnauthorizedException("Срок действия токена 2FA истек. Войдите заново.");
        }

        User user = userRepository.findById(preAuth.getUser().getId())
                .orElseThrow(() -> new UnauthorizedException("Пользователь не найден"));

        if (user.getTotpSecret() == null) {
            throw new UnauthorizedException("2FA не настроена");
        }

        if (preAuth.getAttempts() >= 5) {
            preAuthRepository.delete(preAuth);
            throw new UnauthorizedException("Превышен лимит попыток. Войдите заново.");
        }

        if (!codeVerifier.isValidCode(user.getTotpSecret(), code)) {
            preAuth.setAttempts(preAuth.getAttempts() + 1);
            preAuthRepository.save(preAuth);
            if (preAuth.getAttempts() >= 5) {
                preAuthRepository.delete(preAuth);
                throw new UnauthorizedException("Превышен лимит попыток. Войдите заново.");
            }
            throw new UnauthorizedException("Неверный код 2FA");
        }
        
        return user;
    }

    @Transactional
    public void deletePreAuthToken(String token) {
        preAuthRepository.deleteByToken(token);
    }

    @Scheduled(fixedDelay = 300000)
    @Transactional
    public void purgeExpiredTokens() {
        preAuthRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
