package com.example.zhanfinancebackend.modules.auth.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.dto.user.UpdatePasswordRequest;
import com.example.zhanfinancebackend.modules.auth.dto.user.UpdateProfileRequest;
import com.example.zhanfinancebackend.modules.auth.dto.user.UserProfileDto;
import com.example.zhanfinancebackend.modules.auth.entity.AuthProvider;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.entity.ClientProfile;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.mapper.UserMapper;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ClientProfileRepository clientProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final StorageService storageService;
    private final UserMapper userMapper;
    private final TaskRepository taskRepository;
    private final RefreshTokenService refreshTokenService;

    public UserService(UserRepository userRepository, ClientProfileRepository clientProfileRepository, PasswordEncoder passwordEncoder, StorageService storageService, UserMapper userMapper, TaskRepository taskRepository, RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.clientProfileRepository = clientProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.storageService = storageService;
        this.userMapper = userMapper;
        this.taskRepository = taskRepository;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public void softDeleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setDeletedAt(java.time.Instant.now());
        user.setEnabled(false);
        userRepository.save(user);

        refreshTokenService.revokeAll(user);

        // Unassign open tasks back to task pool
        var tasks = taskRepository.findAllByEmployeeWithDetails(user);
        for (var task : tasks) {
            if (task.getStage() == null || task.getStage().getType() == StageType.OPEN) {
                task.setAssignedTo(null);
                taskRepository.save(task);
            }
        }
    }

    @Transactional(readOnly = true)
    public UserProfileDto getMyProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ClientProfile clientProfile = null;
        if (user.getRole() == Role.CLIENT) {
            Optional<ClientProfile> profileOpt = clientProfileRepository.findByUser(user);
            if (profileOpt.isPresent()) {
                clientProfile = profileOpt.get();
            }
        }

        return userMapper.mapToUserProfileDto(user, clientProfile);
    }

    @Transactional
    public UserProfileDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName());
        }

        user = userRepository.save(user);

        if (user.getRole() == Role.CLIENT) {
            Optional<ClientProfile> profileOpt = clientProfileRepository.findByUser(user);
            if (profileOpt.isPresent()) {
                ClientProfile p = profileOpt.get();
                if (request.phone() != null) p.setPhone(request.phone());
                if (request.companyName() != null) p.setCompanyName(request.companyName());
                clientProfileRepository.save(p);
            }
        }

        return getMyProfile(userId);
    }

    @Transactional
    public void updateLocale(Long userId, String locale) {
        if (locale == null || locale.isBlank() || locale.length() > 10) return;
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setLocale(locale);
        userRepository.save(user);
    }

    @Transactional
    public void updatePassword(Long userId, UpdatePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getAuthProvider() == AuthProvider.GOOGLE && user.getPasswordHash() == null) {
            throw new BadRequestException("Пользователи Google не могут менять пароль таким образом");
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Неверный текущий пароль");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenService.revokeAll(user);
    }

    @Transactional
    public UserProfileDto uploadAvatar(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new BadRequestException("Пользователи Google не могут менять аватарку локально");
        }

        if (file.isEmpty()) {
            throw new BadRequestException("Файл пуст");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            throw new BadRequestException("Допустимы только изображения");
        }

        try {
            org.apache.tika.Tika tika = new org.apache.tika.Tika();
            String detectedType = tika.detect(file.getInputStream());
            java.util.Set<String> allowedMimeTypes = java.util.Set.of("image/jpeg", "image/png", "image/webp");
            if (!allowedMimeTypes.contains(detectedType)) {
                throw new BadRequestException("Недопустимый формат изображения (разрешены только JPEG, PNG, WEBP)");
            }
        } catch (java.io.IOException e) {
            throw new BadRequestException("Не удалось прочитать файл изображения");
        }


        // Remove old avatar if exists
        if (user.getAvatarUrl() != null && user.getAvatarUrl().startsWith("/uploads/avatars/")) {
            String oldStorageKey = user.getAvatarUrl().substring("/uploads/avatars/".length());
            storageService.delete(oldStorageKey);
        }

        String storageKey = storageService.store(file);
        String fileUrl = "/uploads/avatars/" + storageKey;
        
        user.setAvatarUrl(fileUrl);
        userRepository.save(user);

        return getMyProfile(userId);
    }
}

