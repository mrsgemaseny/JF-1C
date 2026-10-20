package com.example.zhanfinancebackend.modules.auth.controller;

import com.example.zhanfinancebackend.modules.auth.dto.AuthResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieHelper {

    private final long refreshTokenExpirationMs;

    public AuthCookieHelper(@Value("${app.jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs) {
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public void setTokenCookies(HttpServletResponse response, AuthResponse authResponse) {
        if (authResponse == null || authResponse.accessToken() == null) {
            return;
        }

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", authResponse.accessToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(15 * 60) // 15 minutes
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        if (authResponse.refreshToken() != null) {
            int maxAge = (int) (refreshTokenExpirationMs / 1000);
            ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", authResponse.refreshToken())
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Strict")
                    .path("/")
                    .maxAge(maxAge)
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
            response.setHeader("X-Refresh-Token", authResponse.refreshToken());
        }
    }

    public void clearTokenCookies(HttpServletResponse response) {
        ResponseCookie accessCookie = ResponseCookie.from("accessToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }
}
