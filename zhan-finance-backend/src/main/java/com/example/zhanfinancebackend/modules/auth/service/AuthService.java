package com.example.zhanfinancebackend.modules.auth.service;

import java.util.Map;
import java.util.Optional;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.dto.AuthResponse;
import com.example.zhanfinancebackend.modules.auth.dto.CheckEmailResponse;
import com.example.zhanfinancebackend.modules.auth.dto.ConfirmEmailOtpRequest;
import com.example.zhanfinancebackend.modules.auth.dto.LoginRequest;
import com.example.zhanfinancebackend.modules.auth.dto.RefreshRequest;
import com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest;
import com.example.zhanfinancebackend.modules.auth.dto.ResendEmailOtpRequest;
import com.example.zhanfinancebackend.modules.auth.entity.EmailVerificationOtp;
import com.example.zhanfinancebackend.modules.auth.entity.RegistrationStatus;
import com.example.zhanfinancebackend.modules.auth.entity.RefreshToken;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.auth.security.JwtService;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.crm.service.ClientService;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.TelegramNotifierService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final ClientService clientService;
    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final TwoFactorService twoFactorService;
    private final TelegramNotifierService telegramNotifierService;
    private final EmailOtpService emailOtpService;
    private final ObjectMapper objectMapper;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            ClientService clientService,
            NotificationService notificationService,
            EmailNotificationService emailNotificationService,
            TwoFactorService twoFactorService,
            TelegramNotifierService telegramNotifierService,
            EmailOtpService emailOtpService,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.clientService = clientService;
        this.notificationService = notificationService;
        this.emailNotificationService = emailNotificationService;
        this.twoFactorService = twoFactorService;
        this.telegramNotifierService = telegramNotifierService;
        this.emailOtpService = emailOtpService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException(ErrorCode.EMAIL_ALREADY_REGISTERED.name());
        }

        String passwordHash = passwordEncoder.encode(request.password());

        // Если почта @gmail.com — перенаправляем на OTP подтверждение
        if (request.email().trim().toLowerCase().endsWith("@gmail.com")) {
            EmailOtpService.RegisterOtpResult otpResult = emailOtpService.createRegisterOtpWithDevCode(request, passwordHash);
            return AuthResponse.requiresEmailOtp(otpResult.preAuthToken(), request.email().toLowerCase(), otpResult.devOtpCode());
        }

        Role assignedRole = (request.role() == Role.EMPLOYEE ||
                request.role() == Role.CURATOR  ||
                request.role() == Role.ADVISOR  ||
                request.role() == Role.LEARNER)
                ? request.role()
                : Role.CLIENT;
        boolean isEmployee = assignedRole == Role.EMPLOYEE || assignedRole == Role.CURATOR || assignedRole == Role.ADVISOR;

        User user = new User(
                request.fullName(),
                request.email().toLowerCase(),
                passwordHash,
                assignedRole
        );

        if (isEmployee) {
            user.setEnabled(false);
            user.setRegistrationStatus(RegistrationStatus.PENDING);
        } else {
            user.setRegistrationStatus(RegistrationStatus.APPROVED);
        }

        User savedUser = userRepository.save(user);

        // Создаём CRM-карточку клиента при регистрации
        clientService.ensureProfile(savedUser, request.companyName(), request.phone());

        if (isEmployee) {
            notificationService.notifyAdmins(
                    "Запрос на регистрацию",
                    savedUser.getFullName() + " (" + savedUser.getEmail() + ") хочет зарегистрироваться как сотрудник. Требуется подтверждение.",
                    "/admin/employees"
            );
            return new AuthResponse(
                    null,
                    null,
                    "Bearer",
                    savedUser.getId(),
                    savedUser.getEmail(),
                    savedUser.getFullName(),
                    savedUser.getRole(),
                    false,
                    savedUser.getAvatarUrl(),
                    savedUser.getAuthProvider(),
                    savedUser.getLocale(),
                    false,
                    null,
                    false,
                    true,
                    false,
                    savedUser.getGoogleSub() != null,
                    savedUser.getGoogleEmail()
            );
        } else {
            notificationService.notifyAdmins(
                    "Новая регистрация",
                    savedUser.getFullName() + " (" + savedUser.getEmail() + ") зарегистрировался как клиент",
                    "/admin/employees"
            );
            emailNotificationService.sendWelcomeEmail(savedUser);
            RefreshToken refreshToken = refreshTokenService.create(savedUser);
            return response(savedUser, refreshToken.getToken());
        }
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (org.springframework.security.authentication.DisabledException e) {
            Optional<User> optionalUser = userRepository.findByEmailIgnoreCase(request.email());
            if (optionalUser.isPresent()) {
                User user = optionalUser.get();
                if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                    throw new ApiException(ErrorCode.UNAUTHORIZED, "Неверный пароль.");
                }
                if (!user.isEnabled()) {
                    throw new ApiException(ErrorCode.UNAUTHORIZED, "Аккаунт отключен.");
                }
            }
            throw e;
        }

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = principal.getUser();

        if (user.getRole() == Role.ADMIN) {
            if (!user.isTwoFactorEnabled()) {
                String preAuthToken = twoFactorService.createPreAuthToken(user);
                return AuthResponse.requires2FASetup(preAuthToken);
            }
            telegramNotifierService.sendAdminNotificationAsync(
                "Попытка входа администратора",
                "Администратор " + user.getEmail() + " проходит авторизацию (ожидается 2FA).",
                null
            );
            String preAuthToken = twoFactorService.createPreAuthToken(user);
            return AuthResponse.requires2FA(preAuthToken);
        }

        if (user.isTwoFactorEnabled()) {
            String preAuthToken = twoFactorService.createPreAuthToken(user);
            return AuthResponse.requires2FA(preAuthToken);
        }

        return buildFullAuthResponse(user);
    }

    @Transactional
    public AuthResponse confirmEmailOtp(ConfirmEmailOtpRequest request) {
        EmailVerificationOtp otp = emailOtpService.verifyOtp(request.preAuthToken(), request.otpCode());

        if ("LOGIN".equals(otp.getPurpose())) {
            User user = userRepository.findById(otp.getUser().getId())
                    .orElseThrow(() -> new UnauthorizedException("Пользователь не найден"));

            if (user.getRole() == Role.ADMIN) {
                if (!user.isTwoFactorEnabled()) {
                    String preAuthToken = twoFactorService.createPreAuthToken(user);
                    return AuthResponse.requires2FASetup(preAuthToken);
                }
                String preAuthToken = twoFactorService.createPreAuthToken(user);
                return AuthResponse.requires2FA(preAuthToken);
            }

            if (user.isTwoFactorEnabled()) {
                String preAuthToken = twoFactorService.createPreAuthToken(user);
                return AuthResponse.requires2FA(preAuthToken);
            }

            return buildFullAuthResponse(user);
        } else if ("REGISTER".equals(otp.getPurpose())) {
            Map<String, Object> payload;
            try {
                payload = objectMapper.readValue(otp.getRegistrationPayload(), new TypeReference<>() {});
            } catch (Exception e) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Ошибка десериализации данных регистрации");
            }

            String email = (String) payload.get("email");
            if (userRepository.existsByEmailIgnoreCase(email)) {
                throw new ConflictException(ErrorCode.EMAIL_ALREADY_REGISTERED.name());
            }

            String fullName = (String) payload.get("fullName");
            String passwordHash = (String) payload.get("passwordHash");
            String roleStr = (String) payload.get("role");
            String companyName = (String) payload.get("companyName");
            String phone = (String) payload.get("phone");

            Role assignedRole = Role.CLIENT;
            if (roleStr != null) {
                try {
                    assignedRole = Role.valueOf(roleStr);
                } catch (IllegalArgumentException ignored) {
                }
            }

            boolean isEmployee = assignedRole == Role.EMPLOYEE || assignedRole == Role.CURATOR || assignedRole == Role.ADVISOR;

            User user = new User(fullName, email.toLowerCase(), passwordHash, assignedRole);
            if (isEmployee) {
                user.setEnabled(false);
                user.setRegistrationStatus(RegistrationStatus.PENDING);
            } else {
                user.setRegistrationStatus(RegistrationStatus.APPROVED);
            }

            User savedUser = userRepository.save(user);
            clientService.ensureProfile(savedUser, companyName, phone);

            if (isEmployee) {
                notificationService.notifyAdmins(
                        "Запрос на регистрацию",
                        savedUser.getFullName() + " (" + savedUser.getEmail() + ") хочет зарегистрироваться как сотрудник. Требуется подтверждение.",
                        "/admin/employees"
                );
                return new AuthResponse(
                        null, null, "Bearer", savedUser.getId(), savedUser.getEmail(), savedUser.getFullName(),
                        savedUser.getRole(), false, savedUser.getAvatarUrl(), savedUser.getAuthProvider(),
                        savedUser.getLocale(), false, null, false, true, false, false, null
                );
            } else {
                notificationService.notifyAdmins(
                        "Новая регистрация",
                        savedUser.getFullName() + " (" + savedUser.getEmail() + ") подтвердил почту и зарегистрировался",
                        "/admin/employees"
                );
                emailNotificationService.sendWelcomeEmail(savedUser);
                return buildFullAuthResponse(savedUser);
            }
        }

        throw new BadRequestException("Неизвестный тип подтверждения OTP");
    }

    public void resendEmailOtp(ResendEmailOtpRequest request) {
        emailOtpService.resendOtp(request.preAuthToken());
    }

    public AuthResponse buildFullAuthResponse(User user) {
        RefreshToken refreshToken = refreshTokenService.create(user);
        return response(user, refreshToken.getToken());
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken rotatedToken = refreshTokenService.verify(request.refreshToken());
        User user = rotatedToken.getUser();

        return response(user, rotatedToken.getToken());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revoke(refreshToken);
        }
    }

    private AuthResponse response(User user, String refreshToken) {
        return new AuthResponse(
                jwtService.generateAccessToken(user),
                refreshToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                false,
                user.getAvatarUrl(),
                user.getAuthProvider(),
                user.getLocale(),
                false,
                null,
                user.isTwoFactorEnabled(),
                false,
                false,
                user.getGoogleSub() != null,
                user.getGoogleEmail()
        );
    }

    public AuthResponse me(User user) {
        return new AuthResponse(
                null,
                null,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                false,
                user.getAvatarUrl(),
                user.getAuthProvider(),
                user.getLocale(),
                false,
                null,
                user.isTwoFactorEnabled(),
                false,
                false,
                user.getGoogleSub() != null,
                user.getGoogleEmail()
        );
    }

    public CheckEmailResponse checkEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email.trim())
                .map(user -> new CheckEmailResponse(true, user.getAuthProvider()))
                .orElse(new CheckEmailResponse(false, null));
    }
}
