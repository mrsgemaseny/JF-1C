package com.example.zhanfinancebackend.modules.documents.config;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.documents.entity.DocumentTemplate;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentTemplateRepository;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfficialDocumentTemplateSeederTest {

    @Mock
    private DocumentTemplateRepository templateRepository;

    @Mock
    private StorageService storageService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionTemplate transactionTemplate;

    private OfficialDocumentTemplateSeeder seeder;

    private User admin;

    @BeforeEach
    void setUp() {
        seeder = new OfficialDocumentTemplateSeeder(
                templateRepository,
                storageService,
                userRepository,
                transactionTemplate
        );

        admin = new User("admin@test.com", "pass", "Admin", Role.ADMIN);
    }

    private void mockTransactionTemplateExecution() {
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(mock(TransactionStatus.class));
        });
    }

    @Test
    @DisplayName("Fresh database: seeds all 3 official templates")
    void seedOfficialTemplates_freshDatabase_seedsAllThreeTemplates() throws Exception {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        when(templateRepository.existsByNameIgnoreCase(anyString())).thenReturn(false);
        when(storageService.store(any(byte[].class), anyString(), anyString())).thenReturn("mock/storage/path.docx");
        mockTransactionTemplateExecution();

        seeder.seedOfficialTemplates();

        verify(templateRepository).existsByNameIgnoreCase("Акт выполненных работ (Форма Р-1)");
        verify(templateRepository).existsByNameIgnoreCase("Отчет об оказанных услугах (АВР)");
        verify(templateRepository).existsByNameIgnoreCase("Лист согласования и подписи");

        verify(storageService, times(3)).store(
                any(byte[].class),
                anyString(),
                eq("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        );

        ArgumentCaptor<DocumentTemplate> templateCaptor = ArgumentCaptor.forClass(DocumentTemplate.class);
        verify(templateRepository, times(3)).save(templateCaptor.capture());

        List<DocumentTemplate> savedTemplates = templateCaptor.getAllValues();
        assertEquals(3, savedTemplates.size());
        assertTrue(savedTemplates.stream().anyMatch(t -> t.getName().equals("Акт выполненных работ (Форма Р-1)")));
        assertTrue(savedTemplates.stream().anyMatch(t -> t.getName().equals("Отчет об оказанных услугах (АВР)")));
        assertTrue(savedTemplates.stream().anyMatch(t -> t.getName().equals("Лист согласования и подписи")));

        verify(templateRepository, never()).delete(any());
        verify(templateRepository, never()).deleteAll();
    }

    @Test
    @DisplayName("Already seeded database: skips all templates, zero deletes, zero saves, zero storage writes")
    void seedOfficialTemplates_alreadySeededDatabase_skipsAllTemplates() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        when(templateRepository.existsByNameIgnoreCase(anyString())).thenReturn(true);

        seeder.seedOfficialTemplates();

        verify(templateRepository).existsByNameIgnoreCase("Акт выполненных работ (Форма Р-1)");
        verify(templateRepository).existsByNameIgnoreCase("Отчет об оказанных услугах (АВР)");
        verify(templateRepository).existsByNameIgnoreCase("Лист согласования и подписи");

        verify(storageService, never()).store(any(), any(), any());
        verify(templateRepository, never()).save(any());
        verify(templateRepository, never()).delete(any());
        verify(transactionTemplate, never()).execute(any());
    }

    @Test
    @DisplayName("Customized template in database: seeder does not delete, update, or overwrite customized template")
    void seedOfficialTemplates_customizedTemplateInDatabase_preservesCustomizedTemplate() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        when(templateRepository.existsByNameIgnoreCase("Акт выполненных работ (Форма Р-1)")).thenReturn(true);
        when(templateRepository.existsByNameIgnoreCase("Отчет об оказанных услугах (АВР)")).thenReturn(true);
        when(templateRepository.existsByNameIgnoreCase("Лист согласования и подписи")).thenReturn(true);

        seeder.seedOfficialTemplates();

        verify(templateRepository, never()).delete(any());
        verify(templateRepository, never()).save(any());
        verify(storageService, never()).store(any(), any(), any());
    }

    @Test
    @DisplayName("Partial database: seeds only missing templates without touching existing template")
    void seedOfficialTemplates_partialDatabase_seedsOnlyMissingTemplates() throws Exception {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        when(templateRepository.existsByNameIgnoreCase("Акт выполненных работ (Форма Р-1)")).thenReturn(true);
        when(templateRepository.existsByNameIgnoreCase("Отчет об оказанных услугах (АВР)")).thenReturn(false);
        when(templateRepository.existsByNameIgnoreCase("Лист согласования и подписи")).thenReturn(false);
        when(storageService.store(any(byte[].class), anyString(), anyString())).thenReturn("mock/storage/path.docx");
        mockTransactionTemplateExecution();

        seeder.seedOfficialTemplates();

        verify(storageService, times(2)).store(
                any(byte[].class),
                anyString(),
                eq("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        );

        ArgumentCaptor<DocumentTemplate> templateCaptor = ArgumentCaptor.forClass(DocumentTemplate.class);
        verify(templateRepository, times(2)).save(templateCaptor.capture());

        List<DocumentTemplate> savedTemplates = templateCaptor.getAllValues();
        assertEquals(2, savedTemplates.size());
        assertFalse(savedTemplates.stream().anyMatch(t -> t.getName().equals("Акт выполненных работ (Форма Р-1)")));
        assertTrue(savedTemplates.stream().anyMatch(t -> t.getName().equals("Отчет об оказанных услугах (АВР)")));
        assertTrue(savedTemplates.stream().anyMatch(t -> t.getName().equals("Лист согласования и подписи")));

        verify(templateRepository, never()).delete(any());
    }

    @Test
    @DisplayName("No admin user in database: seeds templates with null createdBy gracefully")
    void seedOfficialTemplates_noAdminUser_seedsWithNullCreatedByGracefully() throws Exception {
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(templateRepository.existsByNameIgnoreCase(anyString())).thenReturn(false);
        when(storageService.store(any(byte[].class), anyString(), anyString())).thenReturn("mock/storage/path.docx");
        mockTransactionTemplateExecution();

        assertDoesNotThrow(() -> seeder.seedOfficialTemplates());

        ArgumentCaptor<DocumentTemplate> templateCaptor = ArgumentCaptor.forClass(DocumentTemplate.class);
        verify(templateRepository, times(3)).save(templateCaptor.capture());

        for (DocumentTemplate template : templateCaptor.getAllValues()) {
            assertNull(template.getCreatedBy());
        }
    }
}
