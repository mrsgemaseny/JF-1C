package com.example.zhanfinancebackend.modules.notifications.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.notifications.dto.NotificationDto;
import com.example.zhanfinancebackend.modules.notifications.entity.Notification;
import com.example.zhanfinancebackend.modules.notifications.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.telegram.service.TelegramOutboxService;

@Service
public class NotificationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final EmailNotificationService emailNotificationService;
    private final UserRepository userRepository;
    private final TelegramNotifierService telegramNotifierService;
    private final TelegramOutboxService telegramOutboxService;

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url}")
    private String frontendUrl;

    public NotificationService(NotificationRepository notificationRepository, 
                               EmailNotificationService emailNotificationService,
                               UserRepository userRepository,
                               TelegramNotifierService telegramNotifierService,
                               TelegramOutboxService telegramOutboxService) {
        this.notificationRepository = notificationRepository;
        this.emailNotificationService = emailNotificationService;
        this.userRepository = userRepository;
        this.telegramNotifierService = telegramNotifierService;
        this.telegramOutboxService = telegramOutboxService;
    }

    @Transactional
    public void createNotification(User user, String title, String message, String relativeLink) {
        if (user == null) return;
        Notification notification = new Notification(user, title, message, relativeLink);
        notificationRepository.save(notification);

        if (telegramOutboxService != null) {
            try {
                telegramOutboxService.enqueue(user, title, message, relativeLink);
            } catch (Exception e) {
                // Outbox failure should not fail core notification persistence
                log.warn("Telegram outbox enqueue failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    public void createNotification(User user, String title, String message) {
        createNotification(user, title, message, null);
    }

    @Transactional
    public void notifyAdmins(String title, String message, String relativeLink) {
        List<User> admins = userRepository.findAllByRole(Role.ADMIN);
        for (User admin : admins) {
            createNotification(admin, title, message, relativeLink);
        }

        // Also send to Telegram business channel for admins
        String fullLink = null;
        if (relativeLink != null) {
            fullLink = frontendUrl + relativeLink;
        }
        telegramNotifierService.sendAdminNotificationAsync(title, message, fullLink);
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> getUserNotificationsPaged(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(Long userId) {
        Pageable bounded = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));
        return getUserNotificationsPaged(userId, bounded).getContent();
    }

    @Transactional
    public NotificationDto markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }

        notification.setRead(true);
        return mapToDto(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    private NotificationDto mapToDto(Notification notification) {
        return new NotificationDto(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getLink(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
