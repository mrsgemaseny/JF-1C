package com.example.zhanfinancebackend.modules.auth.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
public class ApiRateLimitFilter extends OncePerRequestFilter {

    public enum RateLimitTier {
        TASKS(100, Duration.ofMinutes(1)),
        DOCUMENT_DOWNLOAD(20, Duration.ofMinutes(1)),
        SEARCH(30, Duration.ofMinutes(1)),
        GENERAL(100, Duration.ofMinutes(1));

        private final int capacity;
        private final Duration refillDuration;

        RateLimitTier(int capacity, Duration refillDuration) {
            this.capacity = capacity;
            this.refillDuration = refillDuration;
        }

        public int getCapacity() {
            return capacity;
        }

        public Duration getRefillDuration() {
            return refillDuration;
        }
    }

    private final JwtService jwtService;

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(30, TimeUnit.MINUTES)
            .maximumSize(20000)
            .build();

    @Autowired
    public ApiRateLimitFilter(@Autowired(required = false) JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public ApiRateLimitFilter() {
        this(null);
    }

    private Bucket createBucket(RateLimitTier tier) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(
                        tier.getCapacity(),
                        Refill.greedy(tier.getCapacity(), tier.getRefillDuration())
                ))
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String uri = request.getRequestURI();
        if (isWhitelisted(uri)) {
            chain.doFilter(request, response);
            return;
        }

        RateLimitTier tier = resolveTier(uri);
        String clientKey = resolveClientKey(request);
        String bucketKey = tier.name() + ":" + clientKey;

        Bucket bucket = buckets.get(bucketKey, k -> createBucket(tier));

        if (bucket != null && bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json;charset=UTF-8");
            String reqId = UUID.randomUUID().toString();
            response.getWriter().write(String.format(
                    "{\"status\":429,\"code\":\"TOO_MANY_REQUESTS\",\"message\":\"Too many requests. Please try again later.\",\"path\":\"%s\",\"requestId\":\"%s\"}",
                    uri, reqId
            ));
        }
    }

    private boolean isWhitelisted(String uri) {
        if (uri == null) {
            return true;
        }
        // Auth endpoints are protected separately by AuthRateLimitFilter
        if (uri.startsWith("/api/v1/auth") || uri.startsWith("/api/auth") || uri.startsWith("/v1/auth") || uri.startsWith("/auth")) {
            return true;
        }
        // Payment provider callbacks arrive from a few shared IPs; throttling them would drop payments.
        if (uri.startsWith("/api/v1/payments/callbacks/") || uri.startsWith("/v1/payments/callbacks/")) {
            return true;
        }
        // Internal bot API
        if (uri.startsWith("/api/v1/internal") || uri.startsWith("/v1/internal")) {
            return true;
        }
        // Internal health checks and actuator monitoring
        if (uri.startsWith("/actuator") || uri.startsWith("/api/actuator") || uri.startsWith("/v1/actuator") || uri.startsWith("/api/v1/actuator")
                || uri.equals("/health") || uri.equals("/api/health") || uri.startsWith("/health/") || uri.startsWith("/api/health/")) {
            return true;
        }
        // Public avatar static resources
        if (uri.startsWith("/uploads/avatars") || uri.startsWith("/api/uploads/avatars")) {
            return true;
        }
        // WebSockets
        if (uri.startsWith("/ws") || uri.startsWith("/api/ws")) {
            return true;
        }
        // Swagger / OpenAPI documentation
        if (uri.startsWith("/v3/api-docs") || uri.startsWith("/swagger-ui") || uri.startsWith("/swagger-resources") || uri.startsWith("/webjars") || uri.equals("/favicon.ico")) {
            return true;
        }
        // Non-API routes
        if (!uri.startsWith("/api/") && !uri.startsWith("/v1/") && !uri.startsWith("/uploads/")) {
            return true;
        }
        return false;
    }

    private RateLimitTier resolveTier(String uri) {
        if (uri == null) {
            return RateLimitTier.GENERAL;
        }
        String normalized = uri.toLowerCase();

        if (normalized.contains("/documents") || normalized.contains("/document-templates")
                || normalized.contains("/download") || normalized.contains("/files")
                || normalized.contains("/uploads")) {
            return RateLimitTier.DOCUMENT_DOWNLOAD;
        }

        if (normalized.contains("/search")) {
            return RateLimitTier.SEARCH;
        }

        if (normalized.contains("/tasks")) {
            return RateLimitTier.TASKS;
        }

        return RateLimitTier.GENERAL;
    }

    private String resolveClientKey(HttpServletRequest request) {
        // 1. Check SecurityContextHolder
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            Object principal = auth.getPrincipal();
            if (principal instanceof UserPrincipal userPrincipal && userPrincipal.getId() != null) {
                return "user:" + userPrincipal.getId();
            }
            String name = auth.getName();
            if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
                return "user:" + name;
            }
        }

        // 2. Fallback to JWT in cookies or Authorization header
        if (jwtService != null) {
            String token = extractJwtToken(request);
            if (token != null && !token.isBlank()) {
                Long userId = jwtService.extractUserIdIfValidAccessToken(token);
                if (userId != null) {
                    return "user:" + userId;
                }
                String username = jwtService.extractUsernameIfValidAccessToken(token);
                if (username != null && !username.isBlank()) {
                    return "user:" + username;
                }
            }
        }

        // 3. Fallback to client IP
        return "ip:" + resolveClientIp(request);
    }

    private String extractJwtToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("Fly-Client-IP");
        if (ip != null && !ip.isBlank()) {
            return ip.trim();
        }
        ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            // The first entry is client-controlled; the last one is appended by our own reverse proxy.
            int commaIdx = ip.lastIndexOf(',');
            return (commaIdx > -1 ? ip.substring(commaIdx + 1) : ip).trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) {
            return ip.trim();
        }
        ip = request.getRemoteAddr();
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        return ip.trim();
    }
}
