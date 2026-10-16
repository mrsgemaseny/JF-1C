package com.example.zhanfinancebackend.modules.landing.service;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.landing.dto.*;
import com.example.zhanfinancebackend.modules.landing.entity.ContactRequest;
import com.example.zhanfinancebackend.modules.landing.entity.ContactRequest.ContactRequestStatus;
import com.example.zhanfinancebackend.modules.landing.entity.ContactRequestFile;
import com.example.zhanfinancebackend.modules.landing.repository.ContactRequestFileRepository;
import com.example.zhanfinancebackend.modules.landing.repository.ContactRequestRepository;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ContactRequestService {

    private final ContactRequestRepository contactRequestRepository;
    private final ContactRequestFileRepository fileRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;

    public ContactRequestService(
            ContactRequestRepository contactRequestRepository,
            ContactRequestFileRepository fileRepository,
            StorageService storageService,
            NotificationService notificationService,
            EmailNotificationService emailNotificationService) {
        this.contactRequestRepository = contactRequestRepository;
        this.fileRepository = fileRepository;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.emailNotificationService = emailNotificationService;
    }

    @Transactional
    public ContactRequestDto create(ContactRequestCreateRequest request) {
        ContactRequest contactRequest = new ContactRequest(
                request.name(),
                request.phone(),
                request.email(),
                request.message(),
                request.source()
        );
        ContactRequest saved = contactRequestRepository.save(contactRequest);

        // Уведомление менеджерам (админам)
        try {
            String title = "Новый лид: " + request.name();
            String message = "Телефон: " + request.phone() + (request.email() != null ? ", Email: " + request.email() : "");
            notificationService.notifyAdmins(title, message, "/admin/leads");
        } catch (Exception e) {
            // Игнорируем ошибку уведомлений, чтобы не сбросить создание лида
        }

        // Email самому лиду
        if (request.email() != null && !request.email().isBlank()) {
            try {
                String ticketNum = "ZF-" + (1000 + saved.getId());
                String subject = "Заявка #" + ticketNum + ": Подтверждение получения — Zhan Finance";
                
                String contentHtml = String.format(
                    "<p style=\"color: #4b5563; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 24px;\">" +
                    "Мы успешно получили вашу заявку. Наш специалист свяжется с вами в течение <b>2 рабочих часов</b> (Пн-Пт с 9:00 до 18:00).</p>" +
                    "<table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;\">" +
                    "  <tr><td style=\"padding: 24px;\">" +
                    "    <p style=\"color: #047857; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px;\">Детали обращения</p>" +
                    "    <table width=\"100%%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">" +
                    "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px; width: 35%%;\">Номер заявки:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 700;\">#%s</td></tr>" +
                    "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px;\">Заявитель:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
                    "      <tr><td style=\"padding-bottom: 12px; color: #6b7280; font-size: 14px;\">Телефон:</td><td style=\"padding-bottom: 12px; color: #111827; font-size: 15px; font-weight: 500;\">%s</td></tr>" +
                    "      <tr><td style=\"padding-bottom: 0; color: #6b7280; font-size: 14px;\">Источник:</td><td style=\"padding-bottom: 0; color: #111827; font-size: 15px;\">%s</td></tr>" +
                    "    </table>" +
                    "  </td></tr>" +
                    "</table>",
                    ticketNum,
                    org.springframework.web.util.HtmlUtils.htmlEscape(request.name()),
                    org.springframework.web.util.HtmlUtils.htmlEscape(request.phone()),
                    org.springframework.web.util.HtmlUtils.htmlEscape(request.source() != null ? request.source() : "Сайт")
                );

                String htmlBody = emailNotificationService.buildFormalEmailHtml(
                    "Ваша заявка принята",
                    org.springframework.web.util.HtmlUtils.htmlEscape(request.name()),
                    contentHtml,
                    "Перейти на сайт Zhan Finance",
                    emailNotificationService.getFrontendUrl()
                );


                emailNotificationService.sendHtmlEmail(request.email(), subject, htmlBody);
            } catch (Exception e) {
                // Ignore email sending error
            }
        }

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ContactRequestDto> findAll() {
        return contactRequestRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ContactRequestDto findById(Long id) {
        return toDto(get(id));
    }

    @Transactional
    public ContactRequestDto updateStatus(Long id, ContactRequestStatus status) {
        ContactRequest contactRequest = get(id);
        contactRequest.setStatus(status);
        return toDto(contactRequest);
    }

    @Transactional
    public void delete(Long id) {
        ContactRequest contactRequest = get(id);
        contactRequestRepository.delete(contactRequest);
    }

    private static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "doc", "docx", "png", "jpg", "jpeg", "txt", "zip", "xlsx", "xls");

    @org.springframework.transaction.annotation.Transactional
    public List<ContactRequestFileDto> uploadFiles(Long requestId, org.springframework.web.multipart.MultipartFile[] files) {
        ContactRequest contactRequest = get(requestId);

        if (contactRequest.getCreatedAt().isBefore(java.time.Instant.now().minus(30, java.time.temporal.ChronoUnit.MINUTES))) {
            throw new com.example.zhanfinancebackend.common.exception.BadRequestException("Время для загрузки файлов истекло");
        }

        if (files == null || files.length == 0) {
            throw new com.example.zhanfinancebackend.common.exception.BadRequestException("No files provided");
        }

        if (files.length > 5) {
            throw new com.example.zhanfinancebackend.common.exception.BadRequestException("Too many files");
        }

        long existingCount = fileRepository.countByContactRequestId(requestId);
        if (existingCount + files.length > 5) {
            throw new com.example.zhanfinancebackend.common.exception.BadRequestException("Maximum 5 files allowed per contact request");
        }

        List<ContactRequestFile> savedFiles = new ArrayList<>();
        
        for (MultipartFile file : files) {
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
            String ext = "";
            int dotIdx = originalFilename.lastIndexOf('.');
            if (dotIdx > 0 && dotIdx < originalFilename.length() - 1) {
                ext = originalFilename.substring(dotIdx + 1).toLowerCase();
            }
            if (!ALLOWED_EXTENSIONS.contains(ext)) {
                throw new com.example.zhanfinancebackend.common.exception.BadRequestException("File type not allowed: " + ext);
            }

            try {
                org.apache.tika.Tika tika = new org.apache.tika.Tika();
                String detectedType = tika.detect(file.getInputStream());
                
                String storageKey = storageService.store(file);
                ContactRequestFile crFile = new ContactRequestFile(
                        contactRequest,
                        originalFilename,
                        storageKey,
                        detectedType != null ? detectedType : "application/octet-stream",
                        file.getSize()
                );
                
                savedFiles.add(fileRepository.save(crFile));
            } catch (Exception e) {
                throw new com.example.zhanfinancebackend.common.exception.BadRequestException("Failed to process file: " + e.getMessage());
            }
        }

        return savedFiles.stream()
                .map(f -> new ContactRequestFileDto(f.getId(), f.getFileName(), f.getContentType(), f.getFileSize()))
                .collect(Collectors.toList());
    }


    private ContactRequest get(Long id) {
        return contactRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact request not found"));
    }

    private ContactRequestDto toDto(ContactRequest contactRequest) {
        return new ContactRequestDto(
                contactRequest.getId(),
                contactRequest.getName(),
                contactRequest.getPhone(),
                contactRequest.getEmail(),
                contactRequest.getMessage(),
                contactRequest.getSource(),
                contactRequest.getStatus(),
                contactRequest.getCreatedAt(),
                contactRequest.getUpdatedAt()
        );
    }

    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadFile(Long id, Long fileId) {
        ContactRequest contactRequest = get(id);
        ContactRequestFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        
        if (!file.getContactRequest().getId().equals(contactRequest.getId())) {
            throw new ResourceNotFoundException("File not found for this contact request");
        }

        org.springframework.core.io.Resource resource = storageService.loadAsResource(file.getStorageKey());
        
        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(file.getContentType()))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, org.springframework.http.ContentDisposition.inline().filename(file.getFileName(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .body(resource);
    }
}
