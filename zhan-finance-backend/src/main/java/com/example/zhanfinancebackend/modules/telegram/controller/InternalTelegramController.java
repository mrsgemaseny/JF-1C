package com.example.zhanfinancebackend.modules.telegram.controller;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.crm.entity.ClientProfile;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import com.example.zhanfinancebackend.modules.telegram.dto.*;
import com.example.zhanfinancebackend.modules.telegram.entity.TelegramLink;
import com.example.zhanfinancebackend.modules.telegram.repository.TelegramLinkRepository;
import com.example.zhanfinancebackend.modules.telegram.service.TelegramLinkService;
import com.example.zhanfinancebackend.modules.telegram.service.TelegramOutboxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/v1/internal")
@Tag(name = "Internal Telegram API", description = "Endpoints exclusively for ZhanFinance Telegram Bot microservice")
@Transactional(readOnly = true)
public class InternalTelegramController {

    private final TelegramLinkService telegramLinkService;
    private final TelegramOutboxService telegramOutboxService;
    private final TelegramLinkRepository telegramLinkRepository;
    private final ClientProfileRepository clientProfileRepository;
    private final TaskRepository taskRepository;
    private final DocumentRepository documentRepository;

    public InternalTelegramController(
            TelegramLinkService telegramLinkService,
            TelegramOutboxService telegramOutboxService,
            TelegramLinkRepository telegramLinkRepository,
            ClientProfileRepository clientProfileRepository,
            TaskRepository taskRepository,
            DocumentRepository documentRepository
    ) {
        this.telegramLinkService = telegramLinkService;
        this.telegramOutboxService = telegramOutboxService;
        this.telegramLinkRepository = telegramLinkRepository;
        this.clientProfileRepository = clientProfileRepository;
        this.taskRepository = taskRepository;
        this.documentRepository = documentRepository;
    }

    @PostMapping("/telegram/bind")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Transactional
    @Operation(summary = "Bind Telegram chat to user account via deeplink token")
    public ResponseEntity<TelegramBindResponse> bindTelegram(@Valid @RequestBody TelegramBindRequest request) {
        TelegramBindResponse response = telegramLinkService.bindTelegram(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/telegram/chat/{chatId}/client")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Operation(summary = "Resolve client profile and details by Telegram chat ID")
    public ResponseEntity<TelegramClientSummaryDto> getClientByChatId(@PathVariable Long chatId) {
        TelegramLink link = telegramLinkRepository.findByChatIdAndIsActiveTrue(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Telegram link not found for chat ID: " + chatId));

        User user = link.getUser();
        if (user == null || !user.isEnabled() || user.isDeleted()) {
            throw new ResourceNotFoundException("Active user not found for Telegram link: " + chatId);
        }


        Optional<ClientProfile> profileOpt = clientProfileRepository.findByUser(user);

        TelegramClientSummaryDto dto = new TelegramClientSummaryDto(
                true,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                profileOpt.map(ClientProfile::getPhone).orElse(null),
                profileOpt.map(ClientProfile::getCompanyName).orElse(null),
                user.getRole() != null ? user.getRole().name() : null
        );

        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/telegram/chat/{chatId}")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Transactional
    @Operation(summary = "Unlink Telegram account by chat ID")
    public ResponseEntity<Map<String, Object>> unlinkByChatId(@PathVariable Long chatId) {
        telegramLinkService.unlinkByChatId(chatId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Chat unlinked successfully"));
    }

    @GetMapping("/clients/{clientId}/tasks")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Operation(summary = "Get active tasks for a specific client")
    public ResponseEntity<List<TelegramClientTaskDto>> getClientTasks(
            @PathVariable Long clientId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int taskLimit = Math.min(Math.max(limit, 1), 50);
        List<Task> tasks = taskRepository.findAllByClientWithDetails(clientId);

        List<TelegramClientTaskDto> dtos = tasks.stream()
                .filter(t -> !t.isArchived())
                .limit(taskLimit)
                .map(t -> new TelegramClientTaskDto(
                        t.getId(),
                        t.getTitle(),
                        t.getStage() != null ? t.getStage().getName() : null,
                        t.getStage() != null && t.getStage().getType() != null ? t.getStage().getType().name() : null,
                        t.getDueDate() != null ? t.getDueDate().toString() : null,
                        t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : null
                ))
                .toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/clients/{clientId}/documents")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Operation(summary = "Get recent documents for a specific client")
    public ResponseEntity<List<TelegramClientDocumentDto>> getClientDocuments(
            @PathVariable Long clientId,
            @RequestParam(defaultValue = "5") int limit
    ) {
        int docLimit = Math.min(Math.max(limit, 1), 50);
        Page<Document> page = documentRepository.findByUserIdOrderByCreatedAtDesc(clientId, PageRequest.of(0, docLimit));

        List<TelegramClientDocumentDto> dtos = page.getContent().stream()
                .map(d -> new TelegramClientDocumentDto(
                        d.getId(),
                        d.getFileName(),
                        d.getContentType(),
                        d.getFileSize(),
                        d.getStatus(),
                        d.getCreatedAt() != null ? d.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant() : null
                ))
                .toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/telegram/pending")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Operation(summary = "Poll pending outbox notifications for bot transmission")
    public ResponseEntity<List<TelegramNotificationDto>> getPendingNotifications(
            @RequestParam(defaultValue = "50") int limit
    ) {
        List<TelegramNotificationDto> notifications = telegramOutboxService.getPendingNotifications(limit);
        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/telegram/ack")
    @PreAuthorize("hasRole('INTERNAL_BOT')")
    @Transactional
    @Operation(summary = "Acknowledge transmission status of a batch of notifications")
    public ResponseEntity<TelegramAckResponse> acknowledgeNotifications(@RequestBody TelegramAckRequest request) {
        TelegramAckResponse response = telegramOutboxService.acknowledgeBatch(request);
        return ResponseEntity.ok(response);
    }
}
