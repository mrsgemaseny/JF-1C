package com.example.zhanfinancebackend.modules.notifications.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterDeviceTokenRequest(
        @NotBlank @Size(max = 128) String deviceId,
        @NotBlank @Size(max = 512) String pushToken,
        @Size(max = 32) String platform,
        @Size(max = 255) String deviceName
) {}
