package com.example.zhanfinancebackend.modules.documents.service;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.crm.service.CrmAccessService;
import com.example.zhanfinancebackend.modules.documents.dto.DocumentDto;
import com.example.zhanfinancebackend.modules.documents.entity.Document;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private DocumentAccessService documentAccessService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private CrmAccessService crmAccessService;

    @InjectMocks
    private DocumentService documentService;

    private User admin;
    private User client;
    private Task task;
    private MultipartFile file;

    @BeforeEach
    void setUp() {
        admin = new User("admin@test.com", "pass", "Admin", Role.ADMIN);
        org.springframework.test.util.ReflectionTestUtils.setField(admin, "id", 1L);

        client = new User("client@test.com", "pass", "Client", Role.CLIENT);
        org.springframework.test.util.ReflectionTestUtils.setField(client, "id", 2L);

        task = new Task("Test Task", client, admin);
        org.springframework.test.util.ReflectionTestUtils.setField(task, "id", 10L);

        file = new MockMultipartFile("file", "test.pdf", "application/pdf", "dummy content".getBytes());
    }

    @Test
    void uploadDocument_byEmployee_triggersEmailAndInAppNotifications() {
        // Arrange
        when(userRepository.findById(client.getId())).thenReturn(Optional.of(client));
        doNothing().when(documentAccessService).assertCanCreateFor(admin, client);
        when(storageService.store(any(MultipartFile.class))).thenReturn("storage/key/test.pdf");
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        Document savedDoc = new Document(client, admin, "test.pdf", "storage/key/test.pdf", "application/pdf", 1024L);
        org.springframework.test.util.ReflectionTestUtils.setField(savedDoc, "id", 100L);
        savedDoc.setTask(task);
        when(documentRepository.save(any(Document.class))).thenReturn(savedDoc);

        // Act
        DocumentDto result = documentService.uploadDocument(client.getId(), task.getId(), file, admin);

        // Assert
        assertNotNull(result);
        assertEquals("test.pdf", result.getFileName());

        // Verify that client in-app notification is created
        verify(notificationService).createNotification(eq(client), anyString(), anyString(), eq("/client"));
        // Verify that email notification is triggered
        verify(emailNotificationService).sendDocumentAttachedEmail(eq(client), any(Document.class), eq(task));
    }

    @Test
    void getUserDocuments_returnsDirectAndTaskDocuments() {
        // Arrange
        when(userRepository.findById(client.getId())).thenReturn(Optional.of(client));
        doNothing().when(documentAccessService).assertCanCreateFor(client, client);

        Document doc1 = new Document(client, client, "doc1.pdf", "key1", "application/pdf", 100L);
        org.springframework.test.util.ReflectionTestUtils.setField(doc1, "id", 101L);
        Document doc2 = new Document(admin, admin, "doc2.pdf", "key2", "application/pdf", 100L);
        org.springframework.test.util.ReflectionTestUtils.setField(doc2, "id", 102L);
        doc2.setTask(task); // task belongs to client

        when(documentRepository.findByUserIdOrTaskClientId(eq(client.getId()), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(doc1, doc2)));

        // Act
        List<DocumentDto> results = documentService.getUserDocuments(client.getId(), client);

        // Assert
        assertEquals(2, results.size());
        verify(documentRepository).findByUserIdOrTaskClientId(eq(client.getId()), any(org.springframework.data.domain.Pageable.class));
    }
}
