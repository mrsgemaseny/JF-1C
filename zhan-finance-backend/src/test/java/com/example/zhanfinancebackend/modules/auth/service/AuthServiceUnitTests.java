package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.modules.auth.dto.AuthResponse;
import com.example.zhanfinancebackend.modules.auth.dto.LoginRequest;
import com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest;
import com.example.zhanfinancebackend.modules.auth.entity.RefreshToken;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.auth.security.JwtService;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.crm.service.ClientService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceUnitTests {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authManager;
    @Mock
    private JwtService jwtService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private ClientService clientService;
    @Mock
    private com.example.zhanfinancebackend.modules.notifications.service.NotificationService notificationService;
    @Mock
    private com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService emailNotificationService;
    @Mock
    private TwoFactorService twoFactorService;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_NewEmail_Success() {
        RegisterRequest request = new RegisterRequest(
                "John Doe",
                "newuser@test.com",
                "securePassword123",
                Role.CLIENT,
                "+123456789",
                "Test Company"
        );

        User savedUser = new User(
                "John Doe",
                "newuser@test.com",
                "hashed123",
                Role.CLIENT
        );
        ReflectionTestUtils.setField(savedUser, "id", 1L);

        when(userRepository.existsByEmailIgnoreCase("newuser@test.com")).thenReturn(false);
        when(passwordEncoder.encode("securePassword123")).thenReturn("hashed123");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(refreshTokenService.create(savedUser)).thenReturn(new RefreshToken("token123", savedUser, Instant.now().plus(Duration.ofDays(1))));
        when(jwtService.generateAccessToken(savedUser)).thenReturn("accessToken123");

        // ACT
        AuthResponse response = authService.register(request);

        // ASSERT
        assertThat(response.accessToken()).isEqualTo("accessToken123");
        assertThat(response.email()).isEqualTo("newuser@test.com");
        verify(clientService).ensureProfile(eq(savedUser), eq("Test Company"), eq("+123456789"));
        verify(notificationService).notifyAdmins(anyString(), anyString(), anyString());
    }

    @Test
    void register_DuplicateEmail_ThrowsException() {
        RegisterRequest request = new RegisterRequest(
                "Jane Doe",
                "existing@test.com",
                "pass123",
                Role.CLIENT,
                null,
                null
        );

        when(userRepository.existsByEmailIgnoreCase("existing@test.com")).thenReturn(true);

        // ACT & ASSERT
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(com.example.zhanfinancebackend.common.exception.ConflictException.class)
                .hasMessage(com.example.zhanfinancebackend.common.exception.ErrorCode.EMAIL_ALREADY_REGISTERED.name());
    }

    @Test
    void login_InvalidPassword_ThrowsException() {
        LoginRequest request = new LoginRequest("user@test.com", "wrongpass");

        when(authManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }
    
    @Test
    void login_Success() {
        LoginRequest request = new LoginRequest("user@test.com", "pass123");
        
        User user = new User("User", "user@test.com", "hashed", Role.CLIENT);
        ReflectionTestUtils.setField(user, "id", 10L);
        UserPrincipal principal = new UserPrincipal(user);
        
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(principal);
        
        when(authManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        RefreshToken issued = new RefreshToken(RefreshTokenService.hash("refresh123"), user, Instant.now().plus(Duration.ofDays(1)));
        issued.setRawToken("refresh123");
        when(refreshTokenService.create(user)).thenReturn(issued);
        when(jwtService.generateAccessToken(user)).thenReturn("access123");
        AuthResponse response = authService.login(request);
        
        assertThat(response.accessToken()).isEqualTo("access123");
        assertThat(response.refreshToken()).isEqualTo("refresh123");
        assertThat(response.email()).isEqualTo("user@test.com");
    }

    @Test
    void register_AdminRoleAttempt_SanitizesToClient() {
        RegisterRequest request = new RegisterRequest(
                "Attacker",
                "hacker@test.com",
                "securePassword123",
                Role.ADMIN,
                null,
                null
        );

        User savedUser = new User("Attacker", "hacker@test.com", "hashed123", Role.CLIENT);
        ReflectionTestUtils.setField(savedUser, "id", 2L);

        when(userRepository.existsByEmailIgnoreCase("hacker@test.com")).thenReturn(false);
        when(passwordEncoder.encode("securePassword123")).thenReturn("hashed123");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User passedUser = invocation.getArgument(0);
            assertThat(passedUser.getRole()).isEqualTo(Role.CLIENT);
            return savedUser;
        });
        when(refreshTokenService.create(savedUser)).thenReturn(new RefreshToken("token123", savedUser, Instant.now().plus(Duration.ofDays(1))));
        when(jwtService.generateAccessToken(savedUser)).thenReturn("accessToken123");

        AuthResponse response = authService.register(request);

        assertThat(response.role()).isEqualTo(Role.CLIENT);
    }
}

