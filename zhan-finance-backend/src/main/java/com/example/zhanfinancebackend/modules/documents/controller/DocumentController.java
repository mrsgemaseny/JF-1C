package com.example.zhanfinancebackend.modules.documents.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.documents.dto.DocumentDto;
import com.example.zhanfinancebackend.modules.documents.dto.DocumentUploadResponse;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.documents.service.DocumentService;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/v1/documents")
@PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE', 'CLIENT', 'ADVISOR')")
@Tag(name = "Documents", description = "Endpoints for document management")
@SecurityRequirement(name = "bearerAuth")
public class DocumentController {


    private final DocumentService documentService;
    private final StorageService storageService;

    public DocumentController(DocumentService documentService, StorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a document")
    public ApiResponse<DocumentDto> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) Long targetUserId,
            @RequestParam(value = "taskId", required = false) Long taskId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Long finalTargetUserId = targetUserId != null ? targetUserId : principal.getUser().getId();
        return ApiResponse.success(documentService.uploadDocument(finalTargetUserId, taskId, file, principal.getUser()));
    }

    @GetMapping
    @Operation(summary = "Get list of documents for a user")
    public ApiResponse<?> getDocuments(
            @RequestParam(value = "userId", required = false) Long targetUserId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Long finalTargetUserId = targetUserId != null ? targetUserId : principal.getUser().getId();
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
            return ApiResponse.success(documentService.getUserDocumentsPaged(finalTargetUserId, principal.getUser(), pageable));
        }
        return ApiResponse.success(documentService.getUserDocuments(finalTargetUserId, principal.getUser()));
    }

    @GetMapping("/all")
    @Operation(summary = "Get all visible documents for the current employee/admin")
    public ApiResponse<?> getAllDocuments(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
            return ApiResponse.success(documentService.getAllVisibleDocumentsPaged(principal.getUser(), pageable));
        }
        return ApiResponse.success(documentService.getAllVisibleDocuments(principal.getUser()));
    }

    @GetMapping("/task/{taskId}")
    @Operation(summary = "Get documents for a specific task")
    public ApiResponse<?> getTaskDocuments(
            @PathVariable Long taskId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
            return ApiResponse.success(documentService.getTaskDocumentsPaged(taskId, principal.getUser(), pageable));
        }
        return ApiResponse.success(documentService.getTaskDocuments(taskId, principal.getUser()));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update document status")
    public ApiResponse<DocumentDto> updateDocumentStatus(
            @PathVariable Long id,
            @RequestParam("status") String status,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success(documentService.updateDocumentStatus(id, status, principal.getUser()));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download a document")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Document document = documentService.getDocumentWithAccessCheck(id, principal.getUser());
        Resource resource = storageService.loadAsResource(document.getStorageKey());
        
        org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.attachment()
                .filename(document.getFileName() != null ? document.getFileName() : "document", java.nio.charset.StandardCharsets.UTF_8)
                .build();
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .body(resource);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a document")
    public ApiResponse<Void> deleteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        documentService.deleteDocument(id, principal.getUser());
        return ApiResponse.success(null);
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Client confirms/signs a document")
    public ApiResponse<DocumentDto> confirmDocument(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String clientIp = request.getRemoteAddr();
        return ApiResponse.success(documentService.confirmDocument(id, clientIp, principal.getUser()));
    }

    @GetMapping("/download-zip")
    @Operation(summary = "Download selected documents as a ZIP archive")
    public ResponseEntity<byte[]> downloadZip(
            @RequestParam("ids") List<Long> ids,
            @AuthenticationPrincipal UserPrincipal principal) {
        byte[] zipBytes = documentService.generateZipArchive(ids, principal.getUser());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"documents_archive.zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipBytes);
    }
}
