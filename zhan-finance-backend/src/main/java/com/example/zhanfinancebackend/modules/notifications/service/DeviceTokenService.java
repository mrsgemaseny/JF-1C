package com.example.zhanfinancebackend.modules.notifications.service;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.notifications.dto.RegisterDeviceTokenRequest;
import com.example.zhanfinancebackend.modules.notifications.entity.UserDeviceToken;
import com.example.zhanfinancebackend.modules.notifications.repository.UserDeviceTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class DeviceTokenService {

    private final UserDeviceTokenRepository deviceTokenRepository;

    public DeviceTokenService(UserDeviceTokenRepository deviceTokenRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
    }

    @Transactional
    public void registerDevice(User user, RegisterDeviceTokenRequest request) {
        UserDeviceToken token = deviceTokenRepository
                .findByUserIdAndDeviceId(user.getId(), request.deviceId())
                .map(existing -> {
                    existing.setPushToken(request.pushToken());
                    if (request.platform() != null && !request.platform().isBlank()) {
                        existing.setPlatform(request.platform());
                    }
                    if (request.deviceName() != null) {
                        existing.setDeviceName(request.deviceName());
                    }
                    existing.setLastSeenAt(LocalDateTime.now());
                    return existing;
                })
                .orElseGet(() -> new UserDeviceToken(
                        user,
                        request.deviceId(),
                        request.pushToken(),
                        request.platform(),
                        request.deviceName()
                ));
        deviceTokenRepository.save(token);
    }

    @Transactional
    public void unregisterDevice(Long userId, String deviceId) {
        deviceTokenRepository.deleteByUserIdAndDeviceId(userId, deviceId);
    }
}
