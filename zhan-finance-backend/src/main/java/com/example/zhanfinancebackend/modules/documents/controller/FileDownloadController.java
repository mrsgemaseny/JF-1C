package com.example.zhanfinancebackend.modules.documents.controller;

import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.access.prepost.PreAuthorize;

import com.example.zhanfinancebackend.modules.documents.service.DocumentAccessService;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;

@RestController
public class FileDownloadController {

    private static final String AVATAR_URL_PREFIX = "/uploads/avatars/";

    private final StorageService storageService;
    private final DocumentAccessService documentAccessService;
    private final DocumentRepository documentRepository;
    private final com.example.zhanfinancebackend.modules.auth.repository.UserRepository userRepository;

    public FileDownloadController(StorageService storageService,
                                  DocumentAccessService documentAccessService,
                                  DocumentRepository documentRepository,
                                  com.example.zhanfinancebackend.modules.auth.repository.UserRepository userRepository) {
        this.storageService = storageService;
        this.documentAccessService = documentAccessService;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/uploads/{storageKey:.+}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadFile(@PathVariable String storageKey, @AuthenticationPrincipal UserPrincipal principal) {
        Document document = documentRepository.findByStorageKey(storageKey)
            .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        
        documentAccessService.assertCanRead(principal.getUser(), document);
        return serveResource(storageKey);
    }
    @GetMapping("/uploads/avatars/{storageKey:.+}")
    public ResponseEntity<Resource> downloadAvatar(@PathVariable String storageKey) {
        // This endpoint is unauthenticated. Avatars and client documents share one key space
        // (stored_files), so an arbitrary key must never be resolved here: only keys that some
        // user actually references as an avatar are servable. Anything else is 404, not 403,
        // to avoid confirming that a document key exists.
        if (storageKey == null || storageKey.contains("/") || storageKey.contains("..")
                || !userRepository.existsByAvatarUrl(AVATAR_URL_PREFIX + storageKey)) {
            throw new ResourceNotFoundException("File not found");
        }
        return serveResource(storageKey);
    }

    private ResponseEntity<Resource> serveResource(String storageKey) {
        Resource resource = storageService.loadAsResource(storageKey);
        
        String contentType = "application/octet-stream";
        String filename = resource.getFilename();
        if (filename != null) {
            if (filename.endsWith(".pdf")) contentType = "application/pdf";
            else if (filename.endsWith(".png")) contentType = "image/png";
            else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (filename.endsWith(".mp4")) contentType = "video/mp4";
        }

        org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.inline()
                .filename(resource.getFilename() != null ? resource.getFilename() : "file", java.nio.charset.StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}

