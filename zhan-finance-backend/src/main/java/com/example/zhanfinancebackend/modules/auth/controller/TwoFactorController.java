package com.example.zhanfinancebackend.modules.auth.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.auth.dto.AuthResponse;
import com.example.zhanfinancebackend.modules.auth.dto.TwoFactorConfirmRequest;
import com.example.zhanfinancebackend.modules.auth.dto.TwoFactorDisableRequest;
import com.example.zhanfinancebackend.modules.auth.dto.TwoFactorSetupDto;
import com.example.zhanfinancebackend.modules.auth.dto.TwoFactorVerifyRequest;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.auth.service.AuthService;
import com.example.zhanfinancebackend.modules.auth.service.TwoFactorService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth/2fa")
public class TwoFactorController {

    private final TwoFactorService twoFactorService;
    private final AuthService authService;
    private final AuthCookieHelper authCookieHelper;

    public TwoFactorController(TwoFactorService twoFactorService, AuthService authService, AuthCookieHelper authCookieHelper) {
        this.twoFactorService = twoFactorService;
        this.authService = authService;
        this.authCookieHelper = authCookieHelper;
    }

    @PostMapping("/verify")
    public ApiResponse<AuthResponse> verify(@Valid @RequestBody TwoFactorVerifyRequest request, jakarta.servlet.http.HttpServletResponse httpServletResponse) {
        User user = twoFactorService.verifyCode(request.preAuthToken(), request.code());

        twoFactorService.deletePreAuthToken(request.preAuthToken());
        AuthResponse response = authService.buildFullAuthResponse(user);
        authCookieHelper.setTokenCookies(httpServletResponse, response);
        return ApiResponse.success(response);
    }

    @GetMapping("/setup-preauth")
    public ApiResponse<TwoFactorSetupDto> getSetupPreAuth(@org.springframework.web.bind.annotation.RequestParam String preAuthToken) {
        User user = twoFactorService.getUserForPreAuthSetup(preAuthToken);
        TwoFactorSetupDto setupDto = twoFactorService.generateSetup(user);
        return ApiResponse.success(setupDto);
    }

    @PostMapping("/setup-preauth/confirm")
    public ApiResponse<AuthResponse> confirmSetupPreAuth(
            @Valid @RequestBody com.example.zhanfinancebackend.modules.auth.dto.TwoFactorConfirmPreAuthRequest request,
            jakarta.servlet.http.HttpServletResponse httpServletResponse
    ) {
        User user = twoFactorService.confirmSetupWithPreAuth(request.preAuthToken(), request.secret(), request.code());
        twoFactorService.deletePreAuthToken(request.preAuthToken());
        AuthResponse response = authService.buildFullAuthResponse(user);
        authCookieHelper.setTokenCookies(httpServletResponse, response);
        return ApiResponse.success(response);
    }

    @GetMapping("/setup")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TwoFactorSetupDto> getSetup(@AuthenticationPrincipal UserPrincipal principal) {
        TwoFactorSetupDto setupDto = twoFactorService.generateSetup(principal.getUser());
        return ApiResponse.success(setupDto);
    }

    @PostMapping("/setup/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> confirmSetup(
            @Valid @RequestBody TwoFactorConfirmRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        twoFactorService.confirmSetup(principal.getUser(), request.secret(), request.code());
        return ApiResponse.success(null);
    }

    @PostMapping("/disable")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> disable(
            @Valid @RequestBody TwoFactorDisableRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        twoFactorService.disable2FA(principal.getUser(), request.code());
        return ApiResponse.success(null);
    }
}
