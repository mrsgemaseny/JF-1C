package com.example.zhanfinancebackend.modules.documents.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import com.example.zhanfinancebackend.common.exception.BadRequestException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local")
public class LocalStorageService implements StorageService {

    private final Path rootLocation;

    public LocalStorageService(@Value("${app.storage.local.path:./uploads}") String storagePath) {
        this.rootLocation = Paths.get(storagePath).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new BadRequestException("Failed to store empty file.");
            }
            
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown");
            if (originalFilename.contains("..")) {
                throw new BadRequestException("Cannot store file with relative path outside current directory.");
            }

            String storageKey = UUID.randomUUID().toString() + "_" + originalFilename;
            Path destinationFile = this.rootLocation.resolve(Paths.get(storageKey)).normalize().toAbsolutePath();

            if (!destinationFile.getParent().equals(this.rootLocation.toAbsolutePath())) {
                throw new BadRequestException("Cannot store file outside current directory.");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }
            
            return storageKey;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file.");
        }
    }

    @Override
    public String store(byte[] content, String originalFilename, String contentType) {
        try {
            String cleanFilename = StringUtils.cleanPath(originalFilename != null ? originalFilename : "unknown");
            if (cleanFilename.contains("..")) {
                throw new BadRequestException("Cannot store file with relative path outside current directory.");
            }

            String storageKey = UUID.randomUUID().toString() + "_" + cleanFilename;
            Path destinationFile = this.rootLocation.resolve(Paths.get(storageKey)).normalize().toAbsolutePath();

            if (!destinationFile.getParent().equals(this.rootLocation.toAbsolutePath())) {
                throw new BadRequestException("Cannot store file outside current directory.");
            }

            Files.write(destinationFile, content);
            
            return storageKey;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file.", e);
        }
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        try {
            Path file = rootLocation.resolve(storageKey).normalize().toAbsolutePath();
            if (!file.startsWith(this.rootLocation.toAbsolutePath())) {
                throw new BadRequestException("Cannot access file outside current directory.");
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Could not read file: " + storageKey);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Could not read file: " + storageKey);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path file = rootLocation.resolve(storageKey).normalize().toAbsolutePath();
            if (!file.startsWith(this.rootLocation.toAbsolutePath())) {
                throw new BadRequestException("Cannot access file outside current directory.");
            }
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file.");
        }
    }

    @Override
    public byte[] loadAsBytes(String storageKey) {
        try {
            Path file = rootLocation.resolve(storageKey).normalize().toAbsolutePath();
            if (!file.startsWith(this.rootLocation.toAbsolutePath())) {
                throw new BadRequestException("Cannot access file outside current directory.");
            }
            if (Files.exists(file) && Files.isReadable(file)) {
                return Files.readAllBytes(file);
            } else {
                throw new ResourceNotFoundException("Could not read file: " + storageKey);
            }
        } catch (IOException e) {
            throw new ResourceNotFoundException("Could not read file: " + storageKey);
        }
    }
}

