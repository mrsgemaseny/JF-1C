package com.example.zhanfinancebackend.modules.documents.controller;

import com.example.zhanfinancebackend.modules.documents.entity.StoredFile;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import com.example.zhanfinancebackend.modules.documents.repository.StoredFileRepository;
import com.example.zhanfinancebackend.modules.documents.service.DocumentAccessService;
import com.example.zhanfinancebackend.modules.documents.service.DatabaseStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AvatarDownloadRegressionTest {

    @Mock
    private StoredFileRepository storedFileRepository;

    @Mock
    private DocumentAccessService documentAccessService;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private com.example.zhanfinancebackend.modules.auth.repository.UserRepository userRepository;

    @Mock
    private org.springframework.beans.factory.ObjectProvider<com.example.zhanfinancebackend.modules.documents.service.LocalStorageService> localStorageServiceProvider;

    private DatabaseStorageService databaseStorageService;
    private FileDownloadController fileDownloadController;

    @BeforeEach
    void setUp() {
        when(localStorageServiceProvider.getIfAvailable()).thenReturn(null);
        databaseStorageService = new DatabaseStorageService(storedFileRepository, localStorageServiceProvider);
        fileDownloadController = new FileDownloadController(databaseStorageService, documentAccessService, documentRepository, userRepository);
    }

    @Test
    @DisplayName("C1 Regression: Avatar stored without prefix is loaded via downloadAvatar without forcing double prefix")
    void avatarStoredWithoutPrefix_isServedCorrectly() {
        String storageKey = "avatar-uuid-123.png";
        byte[] content = new byte[]{1, 2, 3, 4};
        StoredFile storedFile = new StoredFile(storageKey, "avatar.png", "image/png", content);

        when(userRepository.existsByAvatarUrl("/uploads/avatars/" + storageKey)).thenReturn(true);
        when(storedFileRepository.findById(storageKey)).thenReturn(Optional.of(storedFile));

        ResponseEntity<Resource> response = fileDownloadController.downloadAvatar(storageKey);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("image/png", response.getHeaders().getContentType().toString());
        verify(storedFileRepository).findById(storageKey);
    }

    @Test
    @DisplayName("SEC: public avatar endpoint must not serve a stored_files key that is not referenced as an avatar")
    void downloadAvatar_rejectsKeyNotReferencedByAnyUser() {
        String documentKey = "client-contract-uuid";
        when(userRepository.existsByAvatarUrl("/uploads/avatars/" + documentKey)).thenReturn(false);

        assertThrows(com.example.zhanfinancebackend.common.exception.ResourceNotFoundException.class,
                () -> fileDownloadController.downloadAvatar(documentKey));
        verify(storedFileRepository, never()).findById(anyString());
    }

    @Test
    @DisplayName("SEC: public avatar endpoint rejects path-like keys before touching storage")
    void downloadAvatar_rejectsPathLikeKeys() {
        assertThrows(com.example.zhanfinancebackend.common.exception.ResourceNotFoundException.class,
                () -> fileDownloadController.downloadAvatar("../secrets"));
        verifyNoInteractions(storedFileRepository);
    }

    @Test
    @DisplayName("C1 Regression: DatabaseStorageService resolves keys stored with avatars/ prefix as fallback")
    void databaseStorageService_resolvesPrefixedKeysAsFallback() {
        String rawKey = "legacy-avatar-456.jpg";
        String prefixedKey = "avatars/" + rawKey;
        byte[] content = new byte[]{5, 6, 7, 8};
        StoredFile storedFile = new StoredFile(prefixedKey, "legacy.jpg", "image/jpeg", content);

        when(storedFileRepository.findById(rawKey)).thenReturn(Optional.empty());
        when(storedFileRepository.findById(prefixedKey)).thenReturn(Optional.of(storedFile));

        Resource resource = databaseStorageService.loadAsResource(rawKey);

        assertNotNull(resource);
        assertEquals("legacy.jpg", resource.getFilename());
        verify(storedFileRepository).findById(rawKey);
        verify(storedFileRepository).findById(prefixedKey);
    }

    @Test
    @DisplayName("C1 Regression: DatabaseStorageService resolves keys stripped of avatars/ prefix as fallback")
    void databaseStorageService_resolvesStrippedKeysAsFallback() {
        String rawKey = "avatar-789.png";
        String prefixedKey = "avatars/" + rawKey;
        byte[] content = new byte[]{9, 10};
        StoredFile storedFile = new StoredFile(rawKey, "avatar.png", "image/png", content);

        when(storedFileRepository.findById(prefixedKey)).thenReturn(Optional.empty());
        when(storedFileRepository.findById(rawKey)).thenReturn(Optional.of(storedFile));

        Resource resource = databaseStorageService.loadAsResource(prefixedKey);

        assertNotNull(resource);
        assertEquals("avatar.png", resource.getFilename());
        verify(storedFileRepository).findById(prefixedKey);
        verify(storedFileRepository).findById(rawKey);
    }
}
