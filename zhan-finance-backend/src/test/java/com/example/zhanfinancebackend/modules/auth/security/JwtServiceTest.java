package com.example.zhanfinancebackend.modules.auth.security;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;
    private final String testSecret = "01234567890123456789012345678912"; // 32 chars for HMAC-SHA256
    private final long testExpiration = 3600000;

    @BeforeEach
    void setUp() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"test"});
        
        jwtService = new JwtService(testSecret, testExpiration, env);
        
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setRole(Role.CLIENT);
    }

    @Test
    void testGenerateAccessTokenAndValidate() {
        String token = jwtService.generateAccessToken(testUser);
        assertNotNull(token);
        
        assertTrue(jwtService.isTokenValid(token, "test@example.com"));
        assertEquals("test@example.com", jwtService.extractUsernameIfValidAccessToken(token));
    }

    @Test
    void testIsTokenValid_WrongUsername() {
        String token = jwtService.generateAccessToken(testUser);
        
        assertFalse(jwtService.isTokenValid(token, "wrong@example.com"));
    }

    @Test
    void testExtractUsername_TamperedToken() {
        String token = jwtService.generateAccessToken(testUser);
        String tamperedToken = token.substring(0, token.length() - 5) + "invalid";
        
        assertNull(jwtService.extractUsernameIfValidAccessToken(tamperedToken));
        assertFalse(jwtService.isTokenValid(tamperedToken, "test@example.com"));
    }

    @Test
    void testIsTokenValid_ExpiredToken() throws InterruptedException {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"test"});
        
        // 1 ms expiration
        JwtService shortLivedJwtService = new JwtService(testSecret, 1, env);
        String token = shortLivedJwtService.generateAccessToken(testUser);
        
        Thread.sleep(10); // Wait for expiration
        
        assertFalse(shortLivedJwtService.isTokenValid(token, "test@example.com"));
        assertNull(shortLivedJwtService.extractUsernameIfValidAccessToken(token));
    }

    @Test
    void testIsTokenValid_WrongTypeClaim() {
        // Manually build a token with "refresh" type instead of "access"
        String refreshSecret = "01234567890123456789012345678912";
        javax.crypto.SecretKey key = io.jsonwebtoken.security.Keys.hmacShaKeyFor(refreshSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String refreshToken = io.jsonwebtoken.Jwts.builder()
                .subject(testUser.getEmail())
                .claim("type", "refresh")
                .signWith(key)
                .compact();

        assertFalse(jwtService.isTokenValid(refreshToken, "test@example.com"));
        assertNull(jwtService.extractUsernameIfValidAccessToken(refreshToken));
        assertNull(jwtService.extractUserIdIfValidAccessToken(refreshToken));
    }

    @Test
    void testExtractUserIdIfValidAccessToken() {
        String token = jwtService.generateAccessToken(testUser);
        assertNotNull(token);
        assertEquals(1L, jwtService.extractUserIdIfValidAccessToken(token));

        String tamperedToken = token.substring(0, token.length() - 5) + "invalid";
        assertNull(jwtService.extractUserIdIfValidAccessToken(tamperedToken));
    }
}
