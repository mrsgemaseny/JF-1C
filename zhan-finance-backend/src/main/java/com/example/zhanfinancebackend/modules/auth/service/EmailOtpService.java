package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest;
import com.example.zhanfinancebackend.modules.auth.entity.EmailVerificationOtp;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.EmailVerificationOtpRepository;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class EmailOtpService {

    private static final Logger log = LoggerFactory.getLogger(EmailOtpService.class);
    private static final int OTP_VALIDITY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    private final EmailVerificationOtpRepository otpRepository;
    private final EmailNotificationService emailNotificationService;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    @org.springframework.beans.factory.annotation.Value("${spring.mail.host:smtp.example.com}")
    private String smtpHost;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String smtpUsername;

    private final org.springframework.core.env.Environment environment;

    public record RegisterOtpResult(String preAuthToken, String devOtpCode) {}

    public EmailOtpService(
            EmailVerificationOtpRepository otpRepository,
            EmailNotificationService emailNotificationService,
            ObjectMapper objectMapper
    ) {
        this(otpRepository, emailNotificationService, objectMapper, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public EmailOtpService(
            EmailVerificationOtpRepository otpRepository,
            EmailNotificationService emailNotificationService,
            ObjectMapper objectMapper,
            org.springframework.core.env.Environment environment
    ) {
        this.otpRepository = otpRepository;
        this.emailNotificationService = emailNotificationService;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }



    @Transactional
    public String createLoginOtp(User user) {
        otpRepository.deleteByUser(user);
        otpRepository.deleteByEmailIgnoreCase(user.getEmail());

        String otpCode = generateNumericOtp();
        String preAuthToken = UUID.randomUUID().toString();

        EmailVerificationOtp otp = new EmailVerificationOtp();
        otp.setEmail(user.getEmail().toLowerCase());
        otp.setUser(user);
        otp.setOtpCode(otpCode);
        otp.setPreAuthToken(preAuthToken);
        otp.setPurpose("LOGIN");
        otp.setAttempts(0);
        otp.setLastSentAt(LocalDateTime.now());
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_VALIDITY_MINUTES));

        otpRepository.save(otp);

        emailNotificationService.sendLoginOtpEmail(user.getEmail(), user.getFullName(), otpCode);
        log.info("Issued Gmail login OTP for user {}", user.getEmail());

        return preAuthToken;
    }

    @Transactional
    public RegisterOtpResult createRegisterOtpWithDevCode(RegisterRequest request, String passwordHash) {
        otpRepository.deleteByEmailIgnoreCase(request.email());

        String otpCode = generateNumericOtp();
        String preAuthToken = UUID.randomUUID().toString();

        Map<String, Object> payloadMap = new HashMap<>();
        payloadMap.put("fullName", request.fullName());
        payloadMap.put("email", request.email().toLowerCase());
        payloadMap.put("passwordHash", passwordHash); // Stored as BCrypt hash, never plaintext!
        payloadMap.put("role", request.role() != null ? request.role().name() : "CLIENT");
        payloadMap.put("companyName", request.companyName());
        payloadMap.put("phone", request.phone());

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(payloadMap);
        } catch (JsonProcessingException e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Ошибка сериализации данных регистрации");
        }

        EmailVerificationOtp otp = new EmailVerificationOtp();
        otp.setEmail(request.email().toLowerCase());
        otp.setOtpCode(otpCode);
        otp.setPreAuthToken(preAuthToken);
        otp.setPurpose("REGISTER");
        otp.setRegistrationPayload(jsonPayload);
        otp.setAttempts(0);
        otp.setLastSentAt(LocalDateTime.now());
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_VALIDITY_MINUTES));

        otpRepository.save(otp);

        boolean isProd = environment != null && java.util.Arrays.asList(environment.getActiveProfiles()).contains("prod");
        boolean isDevOtp = !isProd && (smtpUsername == null || smtpUsername.isBlank() || "smtp.example.com".equalsIgnoreCase(smtpHost));
        if (isDevOtp) {
            log.warn("=================================================================");
            log.warn(">>> [DEV EMAIL OTP] Email: {} | Code: {} <<<", request.email(), otpCode);
            log.warn(">>> SMTP credentials are not configured (host={}). <<<", smtpHost);
            log.warn("=================================================================");
        }

        emailNotificationService.sendRegisterOtpEmail(request.email(), request.fullName(), otpCode);
        log.info("Issued Gmail register OTP for email {}", request.email());

        return new RegisterOtpResult(preAuthToken, isDevOtp ? otpCode : null);

    }

    @Transactional
    public String createRegisterOtp(RegisterRequest request, String passwordHash) {
        return createRegisterOtpWithDevCode(request, passwordHash).preAuthToken();
    }

    @Transactional
    public void resendOtp(String preAuthToken) {
        EmailVerificationOtp otp = otpRepository.findByPreAuthToken(preAuthToken)
                .orElseThrow(() -> new UnauthorizedException("Сессия подтверждения не найдена. Попробуйте снова."));

        LocalDateTime now = LocalDateTime.now();
        Duration elapsed = Duration.between(otp.getLastSentAt(), now);
        if (elapsed.getSeconds() < RESEND_COOLDOWN_SECONDS) {
            long remaining = RESEND_COOLDOWN_SECONDS - elapsed.getSeconds();
            throw new ApiException(ErrorCode.RATE_LIMIT_EXCEEDED,
                    "Повторный код можно запросить через " + remaining + " сек.");
        }

        String newOtpCode = generateNumericOtp();
        otp.setOtpCode(newOtpCode);
        otp.setAttempts(0);
        otp.setLastSentAt(now);
        otp.setExpiresAt(now.plusMinutes(OTP_VALIDITY_MINUTES));
        otpRepository.save(otp);

        boolean isProd = environment != null && java.util.Arrays.asList(environment.getActiveProfiles()).contains("prod");
        boolean isDevOtp = !isProd && (smtpUsername == null || smtpUsername.isBlank() || "smtp.example.com".equalsIgnoreCase(smtpHost));
        if (isDevOtp) {
            log.warn("=================================================================");
            log.warn(">>> [DEV RESEND OTP] Email: {} | Code: {} <<<", otp.getEmail(), newOtpCode);
            log.warn("=================================================================");
        }

        if ("LOGIN".equals(otp.getPurpose())) {
            String name = otp.getUser() != null ? otp.getUser().getFullName() : null;
            emailNotificationService.sendLoginOtpEmail(otp.getEmail(), name, newOtpCode);
        } else {
            emailNotificationService.sendRegisterOtpEmail(otp.getEmail(), null, newOtpCode);
        }
        log.info("Resent Gmail OTP for email {}", otp.getEmail());
    }

    @Transactional
    public EmailVerificationOtp verifyOtp(String preAuthToken, String otpCode) {
        EmailVerificationOtp otp = otpRepository.findByPreAuthToken(preAuthToken)
                .orElseThrow(() -> new UnauthorizedException("Срок действия кода истек или сессия недействительна."));

        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRepository.delete(otp);
            throw new UnauthorizedException("Срок действия кода истек. Запросите код заново.");
        }

        if (otp.getAttempts() >= MAX_ATTEMPTS) {
            otpRepository.delete(otp);
            throw new UnauthorizedException("Превышено количество попыток. Запросите код заново.");
        }

        if (!otp.getOtpCode().equals(otpCode.trim())) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);
            if (otp.getAttempts() >= MAX_ATTEMPTS) {
                otpRepository.delete(otp);
                throw new UnauthorizedException("Превышено максимальное число попыток ввода кода.");
            }
            throw new BadRequestException("Неверный код подтверждения");
        }

        otpRepository.delete(otp);
        return otp;
    }

    private String generateNumericOtp() {
        int code = secureRandom.nextInt(1_000_000);
        return String.format("%06d", code);
    }

    @Scheduled(fixedDelay = 900_000)
    @Transactional
    public void purgeExpiredOtps() {
        otpRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
