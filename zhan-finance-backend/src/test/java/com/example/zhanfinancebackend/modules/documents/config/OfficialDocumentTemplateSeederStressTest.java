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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfficialDocumentTemplateSeederStressTest {

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
    @DisplayName("Multi-cycle execution on fresh database: Cycle 1 saves 3, Cycles 2 and 3 execute 0 stores and 0 saves")
    void testMultiCycleExecution_freshDatabase_subsequentCyclesPerformZeroStoreAndZeroSave() throws Exception {
        Set<String> inMemoryStore = new HashSet<>();

        when(userRepository.findAll()).thenReturn(List.of(admin));
        mockTransactionTemplateExecution();

        // Dynamic existsByNameIgnoreCase based on simulated DB state
        when(templateRepository.existsByNameIgnoreCase(anyString())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return inMemoryStore.stream().anyMatch(n -> n.equalsIgnoreCase(name));
        });

        when(storageService.store(any(byte[].class), anyString(), anyString())).thenReturn("mock/path/doc.docx");

        when(templateRepository.save(any(DocumentTemplate.class))).thenAnswer(inv -> {
            DocumentTemplate dt = inv.getArgument(0);
            inMemoryStore.add(dt.getName());
            return dt;
        });

        // Cycle 1: Fresh DB
        seeder.seedOfficialTemplates();
        assertEquals(3, inMemoryStore.size(), "Cycle 1 should populate exactly 3 templates");
        verify(storageService, times(3)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(3)).save(any(DocumentTemplate.class));

        // Cycle 2: Immediate re-run
        seeder.seedOfficialTemplates();
        assertEquals(3, inMemoryStore.size(), "Cycle 2 should not change template count");
        // Cumulative count must still be 3 (meaning 0 calls during cycle 2)
        verify(storageService, times(3)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(3)).save(any(DocumentTemplate.class));

        // Cycle 3: Third consecutive run
        seeder.seedOfficialTemplates();
        assertEquals(3, inMemoryStore.size(), "Cycle 3 should not change template count");
        // Cumulative count must still be 3 (meaning 0 calls during cycle 3)
        verify(storageService, times(3)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(3)).save(any(DocumentTemplate.class));

        // Delete must NEVER be called across any cycles
        verify(templateRepository, never()).delete(any());
        verify(templateRepository, never()).deleteAll();
    }

    @Test
    @DisplayName("Multi-cycle execution with partially existing templates: seeds only missing once, 0 subsequent operations")
    void testMultiCycleExecution_partiallyExistingTemplates_seedsMissingThenZeroSubsequent() throws Exception {
        Set<String> inMemoryStore = new HashSet<>();
        // Pre-populate with 1 customized template
        inMemoryStore.add("Акт выполненных работ (Форма Р-1)");

        when(userRepository.findAll()).thenReturn(List.of(admin));
        mockTransactionTemplateExecution();

        when(templateRepository.existsByNameIgnoreCase(anyString())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return inMemoryStore.stream().anyMatch(n -> n.equalsIgnoreCase(name));
        });

        when(storageService.store(any(byte[].class), anyString(), anyString())).thenReturn("mock/path/doc.docx");
        when(templateRepository.save(any(DocumentTemplate.class))).thenAnswer(inv -> {
            DocumentTemplate dt = inv.getArgument(0);
            inMemoryStore.add(dt.getName());
            return dt;
        });

        // Cycle 1: 1 exists, 2 missing
        seeder.seedOfficialTemplates();
        assertEquals(3, inMemoryStore.size(), "Cycle 1 must seed the 2 missing templates");
        verify(storageService, times(2)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(2)).save(any(DocumentTemplate.class));

        // Cycle 2: All 3 exist
        seeder.seedOfficialTemplates();
        verify(storageService, times(2)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(2)).save(any(DocumentTemplate.class));

        // Cycle 3: All 3 exist
        seeder.seedOfficialTemplates();
        verify(storageService, times(2)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(2)).save(any(DocumentTemplate.class));

        verify(templateRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Case-insensitivity stress test: templates in uppercase/mixed-case skip storage and save")
    void testCaseInsensitivity_mixedCaseTemplates_skippedCompletely() {
        Set<String> inMemoryStore = Set.of(
                "АКТ ВЫПОЛНЕННЫХ РАБОТ (ФОРМА Р-1)",
                "отчет об оказанных услугах (авр)",
                "ЛИСТ СОГЛАСОВАНИЯ И ПОДПИСИ"
        );

        when(userRepository.findAll()).thenReturn(List.of(admin));
        when(templateRepository.existsByNameIgnoreCase(anyString())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return inMemoryStore.stream().anyMatch(n -> n.equalsIgnoreCase(name));
        });

        seeder.seedOfficialTemplates();

        verify(storageService, never()).store(any(), any(), any());
        verify(templateRepository, never()).save(any());
        verify(templateRepository, never()).delete(any());
        verify(transactionTemplate, never()).execute(any());
    }

    @Test
    @DisplayName("Failure isolation and subsequent recovery: failed template is rolled back and retried in cycle 2")
    void testFailureIsolationAndRecovery_failedSeedRetriesInSubsequentCycle() throws Exception {
        Set<String> inMemoryStore = new HashSet<>();
        AtomicInteger storeAttempts = new AtomicInteger(0);

        when(userRepository.findAll()).thenReturn(List.of(admin));
        mockTransactionTemplateExecution();

        when(templateRepository.existsByNameIgnoreCase(anyString())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return inMemoryStore.stream().anyMatch(n -> n.equalsIgnoreCase(name));
        });

        // Fail only on the 2nd template during Cycle 1
        when(storageService.store(any(byte[].class), anyString(), anyString())).thenAnswer(inv -> {
            int attempt = storeAttempts.incrementAndGet();
            if (attempt == 2) {
                throw new RuntimeException("Storage IO failure on template 2");
            }
            return "mock/path/doc.docx";
        });

        when(templateRepository.save(any(DocumentTemplate.class))).thenAnswer(inv -> {
            DocumentTemplate dt = inv.getArgument(0);
            inMemoryStore.add(dt.getName());
            return dt;
        });

        // Cycle 1: Template 1 passes, Template 2 fails, Template 3 passes
        seeder.seedOfficialTemplates();
        assertEquals(2, inMemoryStore.size(), "Templates 1 and 3 should be stored, 2 rolled back");
        assertTrue(inMemoryStore.contains("Акт выполненных работ (Форма Р-1)"));
        assertTrue(inMemoryStore.contains("Лист согласования и подписи"));
        assertFalse(inMemoryStore.contains("Отчет об оказанных услугах (АВР)"));

        // Cycle 2: Storage is now healthy, only template 2 is missing and seeded
        seeder.seedOfficialTemplates();
        assertEquals(3, inMemoryStore.size(), "All 3 templates should now be stored");
        assertTrue(inMemoryStore.contains("Отчет об оказанных услугах (АВР)"));

        // Total store calls = 3 (in cycle 1: 1 success, 1 failure, 1 success) + 1 (in cycle 2: 1 success) = 4
        verify(storageService, times(4)).store(any(byte[].class), anyString(), anyString());
        // Total save calls = 2 (in cycle 1) + 1 (in cycle 2) = 3
        verify(templateRepository, times(3)).save(any(DocumentTemplate.class));

        // Cycle 3: All 3 exist, zero store calls, zero save calls
        seeder.seedOfficialTemplates();
        verify(storageService, times(4)).store(any(byte[].class), anyString(), anyString());
        verify(templateRepository, times(3)).save(any(DocumentTemplate.class));

        verify(templateRepository, never()).delete(any());
    }
}
