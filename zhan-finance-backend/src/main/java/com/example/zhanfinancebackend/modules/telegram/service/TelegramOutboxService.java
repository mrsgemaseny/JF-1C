package com.example.zhanfinancebackend.modules.telegram.service;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.telegram.dto.TelegramAckItemDto;
import com.example.zhanfinancebackend.modules.telegram.dto.TelegramAckRequest;
import com.example.zhanfinancebackend.modules.telegram.dto.TelegramAckResponse;
import com.example.zhanfinancebackend.modules.telegram.dto.TelegramNotificationDto;
import com.example.zhanfinancebackend.modules.telegram.entity.TelegramLink;
import com.example.zhanfinancebackend.modules.telegram.entity.TelegramNotification;
import com.example.zhanfinancebackend.modules.telegram.repository.TelegramLinkRepository;
import com.example.zhanfinancebackend.modules.telegram.repository.TelegramNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class TelegramOutboxService {

    private static final Logger log = LoggerFactory.getLogger(TelegramOutboxService.class);

    private final TelegramNotificationRepository telegramNotificationRepository;
    private final TelegramLinkRepository telegramLinkRepository;
    private final String frontendUrl;

    public TelegramOutboxService(
            TelegramNotificationRepository telegramNotificationRepository,
            TelegramLinkRepository telegramLinkRepository,
            @Value("${app.frontend.url:https://mrsgemaseny.github.io/JF-1C}") String frontendUrl
    ) {
        this.telegramNotificationRepository = telegramNotificationRepository;
        this.telegramLinkRepository = telegramLinkRepository;
        this.frontendUrl = frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "https://mrsgemaseny.github.io/JF-1C";
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void enqueue(User user, String title, String message, String relativeLink) {
        if (user == null || user.getId() == null) {
            return;
        }

        Optional<TelegramLink> linkOpt = telegramLinkRepository.findByUserIdAndIsActiveTrue(user.getId());
        if (linkOpt.isEmpty()) {
            return;
        }

        TelegramLink link = linkOpt.get();
        String formattedMessage = formatHtmlMessage(title, message, relativeLink);

        TelegramNotification notification = new TelegramNotification(link.getChatId(), user, formattedMessage);
        telegramNotificationRepository.save(notification);
        log.debug("Enqueued Telegram outbox notification for user {} (chatId: {})", user.getId(), link.getChatId());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void enqueue(Long userId, String customHtmlMessage) {

        if (userId == null || customHtmlMessage == null || customHtmlMessage.isBlank()) {
            return;
        }

        Optional<TelegramLink> linkOpt = telegramLinkRepository.findByUserIdAndIsActiveTrue(userId);
        if (linkOpt.isEmpty()) {
            return;
        }

        TelegramLink link = linkOpt.get();
        TelegramNotification notification = new TelegramNotification(link.getChatId(), link.getUser(), customHtmlMessage);
        telegramNotificationRepository.save(notification);
        log.debug("Enqueued custom Telegram outbox notification for user {} (chatId: {})", userId, link.getChatId());
    }

    @Transactional(readOnly = true)
    public List<TelegramNotificationDto> getPendingNotifications(int limit) {
        int pageLimit = Math.min(Math.max(limit, 1), 100);
        List<TelegramNotification> pending = telegramNotificationRepository.findByStatusAndAttemptsLessThanOrderByCreatedAtAsc(
                TelegramNotification.STATUS_PENDING,
                3,
                PageRequest.of(0, pageLimit)
        );

        return pending.stream()
                .map(n -> new TelegramNotificationDto(
                        n.getId(),
                        n.getChatId(),
                        n.getUser() != null ? n.getUser().getId() : null,
                        n.getMessage(),
                        n.getAttempts(),
                        n.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public TelegramAckResponse acknowledgeBatch(TelegramAckRequest request) {
        if (request == null) {
            return new TelegramAckResponse(0);
        }

        List<TelegramAckItemDto> items = request.getItems();
        int acknowledgedCount = 0;
        int successCount = 0;
        int failedCount = 0;

        for (TelegramAckItemDto item : items) {
            if (item == null || item.id() == null) {
                continue;
            }

            Optional<TelegramNotification> notifOpt = telegramNotificationRepository.findById(item.id());
            if (notifOpt.isEmpty()) {
                continue;
            }

            TelegramNotification notification = notifOpt.get();
            boolean isSuccess = "SENT".equalsIgnoreCase(item.status()) || Boolean.TRUE.equals(item.success());

            if (isSuccess) {
                notification.setStatus(TelegramNotification.STATUS_SENT);
                notification.setProcessedAt(Instant.now());
                successCount++;
            } else {
                notification.setAttempts(notification.getAttempts() + 1);
                notification.setLastError(item.error());
                if (notification.getAttempts() >= notification.getMaxAttempts()) {
                    notification.setStatus(TelegramNotification.STATUS_FAILED);
                    notification.setProcessedAt(Instant.now());
                }
                failedCount++;

                // If user blocked bot, deactivate link
                if (item.error() != null && (item.error().contains("403") || item.error().toLowerCase().contains("blocked"))) {
                    telegramLinkRepository.findByChatId(notification.getChatId()).ifPresent(link -> {
                        link.setActive(false);
                        link.setUpdatedAt(Instant.now());
                        telegramLinkRepository.save(link);
                        log.info("Deactivated Telegram link for chatId {} due to bot block error", notification.getChatId());
                    });
                }
            }

            telegramNotificationRepository.save(notification);
            acknowledgedCount++;
        }

        return new TelegramAckResponse(acknowledgedCount, acknowledgedCount, successCount, failedCount);
    }

    private String formatHtmlMessage(String title, String message, String relativeLink) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) {
            sb.append("<b>").append(escapeHtml(title.trim())).append("</b>\n\n");
        }
        if (message != null && !message.isBlank()) {
            sb.append(escapeHtml(message.trim()));
        }
        if (relativeLink != null && !relativeLink.isBlank()) {
            String path = relativeLink.trim();
            if (!path.startsWith("/")) {
                path = "/" + path;
            }
            String fullUrl = frontendUrl + path;
            sb.append("\n\n<a href=\"").append(fullUrl).append("\">Открыть в кабинете</a>");
        }
        return sb.toString();
    }

    private String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;");
    }
}
