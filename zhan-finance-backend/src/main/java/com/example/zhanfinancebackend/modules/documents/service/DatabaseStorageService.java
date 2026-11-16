package com.example.zhanfinancebackend.modules.documents.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.documents.entity.StoredFile;
import com.example.zhanfinancebackend.modules.documents.repository.StoredFileRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.UrlResource;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@ConditionalOnProperty(name = "app.storage.type", havingValue = "db", matchIfMissing = true)
public class DatabaseStorageService implements StorageService {

    private final StoredFileRepository storedFileRepository;
    private final LocalStorageService localStorageService;

    public DatabaseStorageService(StoredFileRepository storedFileRepository, org.springframework.beans.factory.ObjectProvider<LocalStorageService> localStorageServiceProvider) {
        this.storedFileRepository = storedFileRepository;
        this.localStorageService = localStorageServiceProvider.getIfAvailable();
    }

    @Override
    public String store(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new BadRequestException("Failed to store empty file.");
            }
            
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown");
            String storageKey = UUID.randomUUID().toString();
            
            StoredFile storedFile = new StoredFile(
                storageKey,
                originalFilename,
                file.getContentType(),
                file.getBytes()
            );
            
            storedFileRepository.save(storedFile);
            return storageKey;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file in database.");
        }
    }

    @Override
    public String store(byte[] content, String originalFilename, String contentType) {
        String cleanFilename = StringUtils.cleanPath(originalFilename != null ? originalFilename : "unknown");
        String storageKey = UUID.randomUUID().toString();
        
        StoredFile storedFile = new StoredFile(
            storageKey,
            cleanFilename,
            contentType,
            content
        );
        
        storedFileRepository.save(storedFile);
        return storageKey;
    }

    @Override
    public byte[] loadAsBytes(String storageKey) {
        java.util.Optional<StoredFile> fileOpt = storedFileRepository.findById(storageKey);
        if (fileOpt.isEmpty()) {
            String altKey = storageKey.startsWith("avatars/")
                    ? storageKey.substring("avatars/".length())
                    : "avatars/" + storageKey;
            fileOpt = storedFileRepository.findById(altKey);
        }
        if (fileOpt.isPresent()) {
            return fileOpt.get().getData();
        }
        
        if (localStorageService != null) {
            try {
                return localStorageService.loadAsBytes(storageKey);
            } catch (Exception e) {
                try {
                    String altKey = storageKey.startsWith("avatars/") 
                            ? storageKey.substring("avatars/".length()) 
                            : "avatars/" + storageKey;
                    return localStorageService.loadAsBytes(altKey);
                } catch (Exception ex) {
                    // Fallthrough to direct disk check
                }
            }
        }

        // Direct disk fallback for local development when storage type is db
        try {
            Path root = Paths.get("./uploads").toAbsolutePath().normalize();
            String cleanKey = storageKey.startsWith("avatars/") ? storageKey.substring("avatars/".length()) : storageKey;
            Path p1 = root.resolve(cleanKey).normalize();
            if (p1.startsWith(root) && Files.exists(p1)) return Files.readAllBytes(p1);
            Path p2 = root.resolve("avatars").resolve(cleanKey).normalize();
            if (p2.startsWith(root) && Files.exists(p2)) return Files.readAllBytes(p2);
        } catch (Exception ignored) {}

        throw new ResourceNotFoundException("Could not read file: " + storageKey);
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        java.util.Optional<StoredFile> fileOpt = storedFileRepository.findById(storageKey);
        if (fileOpt.isEmpty()) {
            String altKey = storageKey.startsWith("avatars/")
                    ? storageKey.substring("avatars/".length())
                    : "avatars/" + storageKey;
            fileOpt = storedFileRepository.findById(altKey);
        }
        if (fileOpt.isPresent()) {
            StoredFile storedFile = fileOpt.get();
            return new ByteArrayResource(storedFile.getData()) {
                @Override
                public String getFilename() {
                    return storedFile.getFileName();
                }
            };
        }
        
        if (localStorageService != null) {
            try {
                return localStorageService.loadAsResource(storageKey);
            } catch (Exception e) {
                try {
                    String altKey = storageKey.startsWith("avatars/") 
                            ? storageKey.substring("avatars/".length()) 
                            : "avatars/" + storageKey;
                    return localStorageService.loadAsResource(altKey);
                } catch (Exception ex) {
                    // Fallthrough to direct disk check
                }
            }
        }

        // Direct disk fallback for local development when storage type is db
        try {
            Path root = Paths.get("./uploads").toAbsolutePath().normalize();
            String cleanKey = storageKey.startsWith("avatars/") ? storageKey.substring("avatars/".length()) : storageKey;
            Path p1 = root.resolve(cleanKey).normalize();
            if (p1.startsWith(root) && Files.exists(p1)) return new UrlResource(p1.toUri());
            Path p2 = root.resolve("avatars").resolve(cleanKey).normalize();
            if (p2.startsWith(root) && Files.exists(p2)) return new UrlResource(p2.toUri());
        } catch (Exception ignored) {}

        throw new ResourceNotFoundException("Could not read file: " + storageKey);
    }

    @Override
    public void delete(String storageKey) {
        storedFileRepository.deleteById(storageKey);
    }
}

