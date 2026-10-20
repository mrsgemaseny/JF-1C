package com.example.zhanfinancebackend.modules.notifications.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.notifications.dto.RegisterDeviceTokenRequest;
import com.example.zhanfinancebackend.modules.notifications.service.DeviceTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/notifications/devices")
@Tag(name = "Device Tokens", description = "Endpoints for mobile push notification device registration")
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;

    public DeviceTokenController(DeviceTokenService deviceTokenService) {
        this.deviceTokenService = deviceTokenService;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Register or update mobile device push token")
    public ApiResponse<Void> registerDevice(
            @Valid @RequestBody RegisterDeviceTokenRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        deviceTokenService.registerDevice(principal.getUser(), request);
        return ApiResponse.success(null, "Device token registered");
    }

    @DeleteMapping("/{deviceId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unregister mobile device push token on logout")
    public ApiResponse<Void> unregisterDevice(
            @PathVariable String deviceId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        deviceTokenService.unregisterDevice(principal.getUser().getId(), deviceId);
        return ApiResponse.success(null, "Device token unregistered");
    }
}
