package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ConflictException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.common.exception.UnauthorizedException;
import com.example.zhanfinancebackend.modules.auth.dto.AuthResponse;
import com.example.zhanfinancebackend.modules.auth.entity.AuthProvider;
import com.example.zhanfinancebackend.modules.auth.entity.RefreshToken;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.auth.security.JwtService;
import com.example.zhanfinancebackend.modules.crm.service.ClientService;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.TelegramNotifierService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
public class GoogleAuthService {

    @Value("${google.client.id:249161344734-j51fft6shbogf2clnrhofn3l0c1euihl.apps.googleusercontent.com}")
    private String googleClientId;

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final ClientService clientService;
    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final TwoFactorService twoFactorService;
    private final TelegramNotifierService telegramNotifierService;

    public GoogleAuthService(
            UserRepository userRepository,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            ClientService clientService,
            NotificationService notificationService,
            EmailNotificationService emailNotificationService,
            TwoFactorService twoFactorService,
            TelegramNotifierService telegramNotifierService
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.clientService = clientService;
        this.notificationService = notificationService;
        this.emailNotificationService = emailNotificationService;
        this.twoFactorService = twoFactorService;
        this.telegramNotifierService = telegramNotifierService;
    }

    public GoogleIdToken.Payload verifyCredential(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new UnauthorizedException(ErrorCode.INVALID_GOOGLE_TOKEN.name());
        }

        GoogleIdToken idToken;
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            idToken = verifier.verify(credential);
        } catch (IOException | GeneralSecurityException e) {
            throw new UnauthorizedException("Google authentication failed: " + e.getMessage());
        }

        if (idToken == null) {
            throw new UnauthorizedException(ErrorCode.INVALID_GOOGLE_TOKEN.name());
        }

        return idToken.getPayload();
    }

    @Transactional
    public AuthResponse loginWithGoogle(String credential, Role requestedRole) {
        GoogleIdToken.Payload payload = verifyCredential(credential);

        String sub = payload.getSubject();
        String email = payload.getEmail().toLowerCase();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        // 1. Поиск по googleSub (первичный неизменяемый ключ)
        Optional<User> optionalUser = userRepository.findByGoogleSub(sub);

        // 2. Если по sub не найден, ищем по email (для пользователей до V127)
        if (optionalUser.isEmpty()) {
            optionalUser = userRepository.findByEmailIgnoreCase(email);
        }

        User user;
        boolean isNewUser;

        if (optionalUser.isPresent()) {
            user = optionalUser.get();
            if (user.getDeletedAt() != null) {
                throw new ApiException(ErrorCode.FORBIDDEN, "Ваш аккаунт удален.");
            }

            if (!user.isEnabled()) {
                return new AuthResponse(
                        null, null, "Bearer", user.getId(), user.getEmail(), user.getFullName(), user.getRole(),
                        false, user.getAvatarUrl(), user.getAuthProvider(), user.getLocale(), false, null, false, true,
                        false, user.getGoogleSub() != null, user.getGoogleEmail()
                );
            }

            boolean updated = false;
            if (user.getGoogleSub() == null) {
                user.setGoogleSub(sub);
                user.setGoogleEmail(email);
                updated = true;
            }
            if (picture != null && user.getAvatarUrl() == null) {
                user.setAvatarUrl(picture);
                updated = true;
            }
            if (updated) {
                user = userRepository.save(user);
            }
            isNewUser = false;
        } else {
            Role assignedRole = (requestedRole == Role.EMPLOYEE ||
                    requestedRole == Role.CURATOR  ||
                    requestedRole == Role.ADVISOR)
                    ? requestedRole
                    : Role.CLIENT;
            boolean isEmployee = assignedRole == Role.EMPLOYEE || assignedRole == Role.CURATOR || assignedRole == Role.ADVISOR;

            user = new User(
                    name != null ? name : "Google User",
                    email,
                    UUID.randomUUID().toString(),
                    assignedRole
            );
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setGoogleSub(sub);
            user.setGoogleEmail(email);
            user.setPasswordSet(false);
            if (picture != null) {
                user.setAvatarUrl(picture);
            }

            if (isEmployee) {
                user.setEnabled(false);
            }

            user = userRepository.save(user);

            if (isEmployee) {
                notificationService.notifyAdmins(
                        "Новая регистрация сотрудника",
                        user.getFullName() + " (" + user.getEmail() + ") запросил доступ как сотрудник — требуется подтверждение",
                        "/admin/employees"
                );
                return new AuthResponse(
                        null, null, "Bearer", user.getId(), user.getEmail(), user.getFullName(), user.getRole(),
                        false, user.getAvatarUrl(), user.getAuthProvider(), user.getLocale(), false, null, false, true,
                        false, true, user.getGoogleEmail()
                );
            }

            clientService.ensureProfile(user);

            notificationService.notifyAdmins(
                    "Новая регистрация",
                    user.getFullName() + " (" + user.getEmail() + ") зарегистрировался как клиент (Google)",
                    "/admin/employees"
            );
            emailNotificationService.sendWelcomeEmail(user);

            isNewUser = true;
        }

        if (user.getRole() == Role.ADMIN) {
            if (!user.isTwoFactorEnabled()) {
                String preAuthToken = twoFactorService.createPreAuthToken(user);
                return AuthResponse.requires2FASetup(preAuthToken);
            }
            telegramNotifierService.sendAdminNotificationAsync(
                    "Попытка входа администратора",
                    "Администратор " + user.getEmail() + " проходит авторизацию (Google, ожидается 2FA).",
                    null
            );
            String preAuthToken = twoFactorService.createPreAuthToken(user);
            return AuthResponse.requires2FA(preAuthToken);
        }

        if (user.isTwoFactorEnabled()) {
            String preAuthToken = twoFactorService.createPreAuthToken(user);
            return AuthResponse.requires2FA(preAuthToken);
        }

        RefreshToken refreshToken = refreshTokenService.create(user);

        return new AuthResponse(
                jwtService.generateAccessToken(user),
                refreshToken.getToken(),
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                isNewUser,
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

    @Transactional
    public void linkGoogleAccount(User currentUser, String credential) {
        GoogleIdToken.Payload payload = verifyCredential(credential);

        String sub = payload.getSubject();
        String email = payload.getEmail().toLowerCase();
        String picture = (String) payload.get("picture");

        userRepository.findByGoogleSub(sub).ifPresent(existing -> {
            if (!existing.getId().equals(currentUser.getId())) {
                throw new ConflictException("Этот Google-аккаунт уже привязан к другому профилю.");
            }
        });

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new BadRequestException("Пользователь не найден"));

        user.setGoogleSub(sub);
        user.setGoogleEmail(email);
        if (user.getAvatarUrl() == null && picture != null) {
            user.setAvatarUrl(picture);
        }

        userRepository.save(user);
    }

    @Transactional
    public void unlinkGoogleAccount(User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new BadRequestException("Пользователь не найден"));

        if (!user.isPasswordSet() && user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new BadRequestException("Нельзя отвязать Google: это единственный способ входа в ваш аккаунт. Сначала установите пароль в настройках.");
        }

        user.setGoogleSub(null);
        user.setGoogleEmail(null);
        userRepository.save(user);
    }
}
