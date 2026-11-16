package com.example.zhanfinancebackend.modules.auth.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testEmailEndpoint_shouldRequireAuth() throws Exception {
        mockMvc.perform(post("/api/v1/test-email").contextPath("/api"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadsEndpoint_shouldRequireAuth() throws Exception {
        mockMvc.perform(get("/uploads/some-file.pdf"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void avatarsEndpoint_shouldBePublic() throws Exception {
        // According to our config, /uploads/avatars/** should be public, although the actual file might not exist (returns 404).
        // Let's just verify it doesn't return 401 Unauthorized.
        mockMvc.perform(get("/uploads/avatars/user-123.jpg"))
                .andExpect(status().isNotFound());
    }

    @Test
    void securityHeaders_shouldBePresentOnResponses() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:;"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
    }

    @Test
    void securityHeaders_shouldBePresentOnUnauthorizedResponses() throws Exception {
        mockMvc.perform(get("/uploads/some-file.pdf"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:;"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
    }

    @Test
    void securityHeaders_shouldBePresentOnForbiddenResponses() throws Exception {
        mockMvc.perform(get("/api/v1/internal/secret").with(user("testuser").roles("CLIENT")).contextPath("/api"))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:;"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
    }

    @Test
    void securityHeaders_shouldBePresentOnNotFoundResponses() throws Exception {
        mockMvc.perform(get("/uploads/avatars/non-existent.jpg"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:;"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
    }
}
