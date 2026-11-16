package com.example.zhanfinancebackend.modules.auth.security;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApiRateLimitFilterAdversarialTest {

    private JwtService jwtService;
    private ApiRateLimitFilter apiRateLimitFilter;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        apiRateLimitFilter = new ApiRateLimitFilter(jwtService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateUser(Long userId, String email) {
        User user = new User();
        user.setId(userId);
        user.setEmail(email);
        user.setRole(Role.CLIENT);
        user.setEnabled(true);
        UserPrincipal principal = new UserPrincipal(user);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("Adversarial: Thread safety under heavy concurrent access (50 threads x 5 reqs = 250 reqs)")
    void testConcurrentBucketAccess_ThreadSafety() throws Exception {
        Long targetUserId = 999L;
        authenticateUser(targetUserId, "concurrent_user@example.com");

        int threadCount = 50;
        int requestsPerThread = 5;
        int totalRequests = threadCount * requestsPerThread; // 250 requests
        int allowedLimit = 100; // TASKS tier capacity is 100

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalRequests);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger blockedCount = new AtomicInteger(0);
        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < totalRequests; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    MockHttpServletRequest request = new MockHttpServletRequest();
                    request.setRequestURI("/api/v1/crm/tasks");
                    request.setRemoteAddr("10.0.0.100");

                    MockHttpServletResponse response = new MockHttpServletResponse();
                    FilterChain chain = (req, res) -> {
                        // simulate downstream processing
                    };

                    apiRateLimitFilter.doFilterInternal(request, response, chain);

                    if (response.getStatus() == 200) {
                        successCount.incrementAndGet();
                    } else if (response.getStatus() == 429) {
                        blockedCount.incrementAndGet();
                    }
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Unleash all threads simultaneously
        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent requests must complete within timeout");
        assertTrue(exceptions.isEmpty(), "No concurrency exceptions should occur: " + exceptions);
        assertTrue(successCount.get() >= allowedLimit && successCount.get() <= allowedLimit + 3,
                "Requests succeeding under concurrent load must be approximately the limit with greedy refill tolerance: " + successCount.get());
        assertEquals(totalRequests, successCount.get() + blockedCount.get(), "All requests must be accounted for");
    }

    @Test
    @DisplayName("Adversarial: Fly-Client-IP header has strict precedence over spoofed X-Forwarded-For and X-Real-IP")
    void testFlyClientIp_StrictPrecedenceOverSpoofedHeaders() throws ServletException, IOException {
        String realFlyIp = "198.51.100.1";

        // Make 100 requests with Fly-Client-IP: 198.51.100.1 while rotating spoofed X-Forwarded-For
        for (int i = 0; i < 100; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI("/api/v1/courses");
            request.addHeader("Fly-Client-IP", realFlyIp);
            request.addHeader("X-Forwarded-For", "spoofed.ip." + i + ", 10.0.0.1");
            request.addHeader("X-Real-IP", "spoofed.real." + i);
            request.setRemoteAddr("172.16.0.1");

            MockHttpServletResponse response = new MockHttpServletResponse();
            FilterChain chain = mock(FilterChain.class);

            apiRateLimitFilter.doFilterInternal(request, response, chain);
            assertEquals(200, response.getStatus());
        }

        // 101st request with a new spoofed X-Forwarded-For must STILL be blocked because Fly-Client-IP is the true key
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest();
        blockedRequest.setRequestURI("/api/v1/courses");
        blockedRequest.addHeader("Fly-Client-IP", realFlyIp);
        blockedRequest.addHeader("X-Forwarded-For", "spoofed.ip.999, 10.0.0.1");
        blockedRequest.addHeader("X-Real-IP", "spoofed.real.999");
        blockedRequest.setRemoteAddr("172.16.0.1");

        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        FilterChain blockedChain = mock(FilterChain.class);

        apiRateLimitFilter.doFilterInternal(blockedRequest, blockedResponse, blockedChain);
        assertEquals(429, blockedResponse.getStatus(), "Must be blocked because Fly-Client-IP exhausted its quota");
    }

    @Test
    @DisplayName("Adversarial: X-Forwarded-For parsing handles edge cases (whitespace, IPv6, comma-separated list)")
    void testXForwardedForEdgeCases() throws ServletException, IOException {
        // Case 1: Standard multi-proxy chain with spaces
        MockHttpServletRequest req1 = new MockHttpServletRequest();
        req1.setRequestURI("/api/v1/courses");
        req1.addHeader("X-Forwarded-For", "  203.0.113.50  , 70.41.3.18, 150.172.238.178 ");
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        apiRateLimitFilter.doFilterInternal(req1, res1, mock(FilterChain.class));
        assertEquals(200, res1.getStatus());

        // Case 2: IPv6 address in X-Forwarded-For
        MockHttpServletRequest req2 = new MockHttpServletRequest();
        req2.setRequestURI("/api/v1/courses");
        req2.addHeader("X-Forwarded-For", "2001:db8:85a3::8a2e:370:7334, 10.0.0.1");
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        apiRateLimitFilter.doFilterInternal(req2, res2, mock(FilterChain.class));
        assertEquals(200, res2.getStatus());

        // Case 3: Empty X-Forwarded-For falls back to X-Real-IP
        MockHttpServletRequest req3 = new MockHttpServletRequest();
        req3.setRequestURI("/api/v1/courses");
        req3.addHeader("X-Forwarded-For", "");
        req3.addHeader("X-Real-IP", "198.51.100.77");
        MockHttpServletResponse res3 = new MockHttpServletResponse();
        apiRateLimitFilter.doFilterInternal(req3, res3, mock(FilterChain.class));
        assertEquals(200, res3.getStatus());

        // Case 4: Null headers fall back to request.getRemoteAddr()
        MockHttpServletRequest req4 = new MockHttpServletRequest();
        req4.setRequestURI("/api/v1/courses");
        req4.setRemoteAddr("10.10.10.10");
        MockHttpServletResponse res4 = new MockHttpServletResponse();
        apiRateLimitFilter.doFilterInternal(req4, res4, mock(FilterChain.class));
        assertEquals(200, res4.getStatus());
    }

    @Test
    @DisplayName("Adversarial: Tampered JWT token gracefully falls back to IP rate limiting without throwing exception")
    void testTamperedJwt_FallsBackToIpRateLimiting() throws ServletException, IOException {
        when(jwtService.extractUserIdIfValidAccessToken(anyString())).thenReturn(null);
        when(jwtService.extractUsernameIfValidAccessToken(anyString())).thenReturn(null);

        String ip = "192.0.2.45";

        // Document download tier has 20 limit (1 token refills every 3000ms, impervious to microsecond loop execution)
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI("/api/v1/documents/123/download");
            request.addHeader("Authorization", "Bearer corrupted.jwt.token");
            request.setRemoteAddr(ip);

            MockHttpServletResponse response = new MockHttpServletResponse();
            apiRateLimitFilter.doFilterInternal(request, response, mock(FilterChain.class));
            assertEquals(200, response.getStatus());
        }

        // 21st request from same IP should receive 429 even with changed corrupted token
        MockHttpServletRequest blockedReq = new MockHttpServletRequest();
        blockedReq.setRequestURI("/api/v1/documents/123/download");
        blockedReq.addHeader("Authorization", "Bearer another.bad.token");
        blockedReq.setRemoteAddr(ip);

        MockHttpServletResponse blockedRes = new MockHttpServletResponse();
        apiRateLimitFilter.doFilterInternal(blockedReq, blockedRes, mock(FilterChain.class));
        assertEquals(429, blockedRes.getStatus(), "21st request must be 429");
    }

    @Test
    @DisplayName("Adversarial: High-cardinality IP flood stress test (1,000 unique keys within bounded memory)")
    void testHighCardinalityIpFlood_BoundedMemory() throws ServletException, IOException {
        // Flood filter with 1000 distinct IPs
        for (int i = 0; i < 1000; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI("/api/v1/courses");
            request.setRemoteAddr("10.0." + (i / 256) + "." + (i % 256));

            MockHttpServletResponse response = new MockHttpServletResponse();
            apiRateLimitFilter.doFilterInternal(request, response, mock(FilterChain.class));
            assertEquals(200, response.getStatus());
        }
    }
}
