package com.example.zhanfinancebackend.common.filter;

import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(-100) // Before Auth
public class CsrfHeaderFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    public CsrfHeaderFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String method = request.getMethod();
        String uri = request.getRequestURI();

        // Machine-to-machine internal bot endpoints are secured by X-Internal-Token, not cookies/sessions
        if (uri != null && (uri.startsWith("/api/v1/internal") || uri.startsWith("/v1/internal"))) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Payment provider callbacks are server-to-server and cannot send our CSRF header; they
        // carry no cookies, and authenticity is checked by signature / IP allowlist in the handler.
        if (uri != null && (uri.startsWith("/api/v1/payments/callbacks/") || uri.startsWith("/v1/payments/callbacks/"))) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only block state-changing requests
        if (HttpMethod.POST.name().equalsIgnoreCase(method) ||
            HttpMethod.PUT.name().equalsIgnoreCase(method) ||
            HttpMethod.DELETE.name().equalsIgnoreCase(method) ||
            HttpMethod.PATCH.name().equalsIgnoreCase(method)) {
            
            // Allow if X-Requested-With header is present
            String requestedWith = request.getHeader("X-Requested-With");
            if (requestedWith != null && !requestedWith.trim().isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }

            // Alternatively, if the request is application/json, it's safe because of CORS preflight
            String contentType = request.getContentType();
            if (contentType != null && contentType.toLowerCase().contains(MediaType.APPLICATION_JSON_VALUE.toLowerCase())) {
                filterChain.doFilter(request, response);
                return;
            }

            // Reject the request to prevent CSRF via simple forms
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            
            ApiResponse<Void> apiResponse = ApiResponse.error("Missing CSRF protection header (X-Requested-With) or application/json content type");
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
