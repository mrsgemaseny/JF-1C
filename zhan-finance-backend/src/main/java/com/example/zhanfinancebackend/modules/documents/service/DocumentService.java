package com.example.zhanfinancebackend.modules.documents.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.entity.User;

import com.example.zhanfinancebackend.modules.documents.dto.DocumentDto;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.crm.service.CrmAccessService;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final StorageService storageService;
    private final DocumentAccessService documentAccessService;
    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final CrmAccessService crmAccessService;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/png", "image/jpeg", "image/webp", "image/gif",
            "text/plain", "text/csv", "text/markdown", "text/x-markdown",
            "application/zip", "application/x-zip-compressed", "application/x-rar-compressed"
    );

    public DocumentService(DocumentRepository documentRepository,
                           UserRepository userRepository,
                           TaskRepository taskRepository,
                           StorageService storageService,
                           DocumentAccessService documentAccessService,
                           NotificationService notificationService,
                           EmailNotificationService emailNotificationService,
                           CrmAccessService crmAccessService) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.storageService = storageService;
        this.documentAccessService = documentAccessService;
        this.notificationService = notificationService;
        this.emailNotificationService = emailNotificationService;
        this.crmAccessService = crmAccessService;
    }

    @Transactional
    public DocumentDto uploadDocument(Long targetUserId, Long taskId, MultipartFile file, User actor) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        documentAccessService.assertCanCreateFor(actor, targetUser);

        String originalFilename = file.getOriginalFilename();
        String contentType = null;
        try {
            org.apache.tika.Tika tika = new org.apache.tika.Tika();
            contentType = tika.detect(file.getInputStream(), originalFilename);
        } catch (Exception e) {
            throw new BadRequestException("Ошибка при проверке содержимого файла");
        }

        if (contentType != null && contentType.equals("application/octet-stream")) {
            String ext = originalFilename != null && originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase() : "";
            if (Set.of("md", "txt", "csv").contains(ext)) {
                contentType = "text/plain"; // fallback for text files misidentified by Tika
            }
        }

        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Недопустимый формат файла (" + contentType + "). Загрузка исполняемых файлов запрещена из соображений безопасности. Разрешены: PDF, DOCX, XLSX, PNG, JPG, ZIP, MD.");
        }

        if (originalFilename != null) {
            String lowerCaseName = originalFilename.toLowerCase();
            if (lowerCaseName.endsWith(".html") || lowerCaseName.endsWith(".htm") || lowerCaseName.endsWith(".svg") || lowerCaseName.endsWith(".exe") || lowerCaseName.endsWith(".js") || lowerCaseName.endsWith(".sh")) {
                throw new BadRequestException("Загрузка исполняемых файлов (.exe, .sh, .js) запрещена из соображений безопасности.");
            }
        }

        String storageKey = storageService.store(file);

        Document document = new Document(
                targetUser,
                actor,
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                storageKey,
                contentType,
                file.getSize()
        );

        if (taskId != null) {
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
            document.setTask(task);
        }

        document = documentRepository.save(document);

        // --- Notification Logic ---
        if (actor.getRole() == Role.CLIENT) {
            // Notify Assigned Employee if exists
            User employee = targetUser.getAssignedEmployee();
            if (employee != null) {
                String link = taskId != null ? "/employee/tasks" : "/employee/documents";
                notificationService.createNotification(
                        employee,
                        "Новый документ",
                        "Клиент " + targetUser.getFullName() + " загрузил файл: " + document.getFileName(),
                        link
                );
            }
            String taskLink = document.getTask() != null
                ? "/admin/tasks/" + document.getTask().getId()
                : "/admin/documents";

        notificationService.notifyAdmins(
                "Новый документ",
                actor.getFullName() + " загрузил файл: " + document.getFileName(),
                taskLink
        );
        } else {
            // Notify the Client
            String link = "/client";
            notificationService.createNotification(
                    targetUser,
                    "Новый документ",
                    "Сотрудник загрузил для вас файл: " + document.getFileName(),
                    link
            );
            
            emailNotificationService.sendDocumentAttachedEmail(targetUser, document, document.getTask());
            
            if (actor.getRole() != Role.ADMIN) {
                notificationService.notifyAdmins(
                        "Загружен документ",
                        actor.getFullName() + " загрузил файл: " + document.getFileName() + " для клиента " + targetUser.getFullName(),
                        "/dashboard/documents"
                );
            }
        }

        return mapToDto(document);
    }

    @Transactional(readOnly = true)
    public Page<DocumentDto> getUserDocumentsPaged(Long targetUserId, User actor, Pageable pageable) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        documentAccessService.assertCanCreateFor(actor, targetUser);

        return documentRepository.findByUserIdOrTaskClientId(targetUserId, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> getUserDocuments(Long targetUserId, User actor) {
        Pageable bounded = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt"));
        return getUserDocumentsPaged(targetUserId, actor, bounded).getContent();
    }

    @Transactional(readOnly = true)
    public Page<DocumentDto> getAllVisibleDocumentsPaged(User actor, Pageable pageable) {
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.ADVISOR) {
            return documentRepository.findAllByOrderByCreatedAtDesc(pageable)
                    .map(this::mapToDto);
        } else if (actor.getRole() == Role.EMPLOYEE) {
            return documentRepository.findForEmployee(actor.getId(), pageable)
                    .map(this::mapToDto);
        } else {
            return getUserDocumentsPaged(actor.getId(), actor, pageable);
        }
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> getAllVisibleDocuments(User actor) {
        Pageable bounded = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt"));
        return getAllVisibleDocumentsPaged(actor, bounded).getContent();
    }

    @Transactional(readOnly = true)
    public Page<DocumentDto> getTaskDocumentsPaged(Long taskId, User actor, Pageable pageable) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        
        crmAccessService.assertCanReadTask(actor, task);

        return documentRepository.findByTaskIdOrderByCreatedAtDesc(taskId, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> getTaskDocuments(Long taskId, User actor) {
        Pageable bounded = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt"));
        return getTaskDocumentsPaged(taskId, actor, bounded).getContent();
    }

    @Transactional
    public DocumentDto updateDocumentStatus(Long documentId, String status, User actor) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        documentAccessService.assertCanWrite(actor, document);
        document.setStatus(status);
        document = documentRepository.save(document);

        // --- Notification Logic ---
        if (actor.getRole() != Role.CLIENT) {
            notificationService.createNotification(
                    document.getUser(),
                    "Статус документа изменен",
                    "Статус документа '" + document.getFileName() + "' изменен на: " + status,
                    "/client"
            );
        }
        
        if (actor.getRole() != Role.ADMIN) {
            notificationService.notifyAdmins(
                 "Статус документа изменен",
                 actor.getFullName() + " изменил статус документа '" + document.getFileName() + "' на: " + status,
                 "/employee/documents"
            );
        }

        return mapToDto(document);
    }

    @Transactional(readOnly = true)
    public Document getDocumentWithAccessCheck(Long documentId, User actor) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        documentAccessService.assertCanRead(actor, document);
        return document;
    }

    @Transactional
    public void deleteDocument(Long documentId, User actor) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        documentAccessService.assertCanWrite(actor, document);
        
        storageService.delete(document.getStorageKey());
        documentRepository.delete(document);
    }

    @Transactional
    public DocumentDto confirmDocument(Long documentId, String clientIp, User actor) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (actor.getRole() != Role.ADMIN && (document.getUser() == null || !document.getUser().getId().equals(actor.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("Only the document owner or an administrator can confirm this document.");
        }

        document.setStatus("CONFIRMED");

        document.setConfirmedAt(java.time.LocalDateTime.now());
        document.setConfirmedIp(clientIp != null ? clientIp : "127.0.0.1");

        Document saved = documentRepository.save(document);

        notificationService.notifyAdmins(
                "Документ подтвержден клиентом",
                "Клиент " + actor.getFullName() + " подтвердил документ: " + saved.getFileName(),
                "/admin/documents"
        );

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public byte[] generateZipArchive(List<Long> documentIds, User actor) {
        List<Document> documents = documentRepository.findDocumentsByIds(documentIds);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.util.Set<String> usedNames = new java.util.HashSet<>();

        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(baos)) {
            for (Document doc : documents) {
                try {
                    documentAccessService.assertCanRead(actor, doc);
                    byte[] fileBytes = storageService.loadAsBytes(doc.getStorageKey());

                    String baseName = doc.getFileName();
                    String entryName = baseName;
                    int counter = 1;

                    while (usedNames.contains(entryName)) {
                        int dotIdx = baseName.lastIndexOf('.');
                        if (dotIdx > 0) {
                            entryName = baseName.substring(0, dotIdx) + "_" + counter + baseName.substring(dotIdx);
                        } else {
                            entryName = baseName + "_" + counter;
                        }
                        counter++;
                    }
                    usedNames.add(entryName);

                    java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry(entryName);
                    zos.putNextEntry(entry);
                    zos.write(fileBytes);
                    zos.closeEntry();
                } catch (Exception e) {
                    // Skip files that fail read/storage checks to avoid failing whole zip
                    continue;
                }
            }
            zos.finish();
        } catch (java.io.IOException e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Ошибка создания ZIP архива: " + e.getMessage());
        }
        return baos.toByteArray();
    }

    private DocumentDto mapToDto(Document document) {
        User uploader = document.getUploadedBy();
        return new DocumentDto(
                document.getId(),
                document.getUser().getId(),
                document.getUser().getFullName(),
                document.getTask() != null ? document.getTask().getId() : null,
                document.getFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getStatus(),
                document.getCreatedAt(),
                document.getConfirmedAt(),
                document.getConfirmedIp(),
                document.getFolder(),
                uploader != null ? uploader.getId() : null,
                uploader != null ? uploader.getFullName() : null,
                uploader != null && uploader.getRole() != null ? uploader.getRole().name() : null
        );
    }
}

