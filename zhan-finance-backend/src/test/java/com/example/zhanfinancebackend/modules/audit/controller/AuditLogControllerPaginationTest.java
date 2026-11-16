package com.example.zhanfinancebackend.modules.audit.controller;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import com.example.zhanfinancebackend.modules.audit.entity.AuditLog;
import com.example.zhanfinancebackend.modules.audit.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogControllerPaginationTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditLogController auditLogController;

    @BeforeEach
    void setUp() {
        auditLogController = new AuditLogController(auditLogRepository);
    }

    @Test
    @DisplayName("C3 Regression: AuditLogController returns Page when page and size query params are provided")
    void getAllAuditLogs_withPagination_returnsPage() {
        AuditLog log = AuditLog.builder()
                .id(1L)
                .action("LOGIN")
                .entityName("USER")
                .entityId(1L)
                .userId(1L)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        Page<AuditLog> page = new PageImpl<>(List.of(log));

        when(auditLogRepository.findAll(any(Pageable.class))).thenReturn(page);

        ApiResponse<?> response = auditLogController.getAllAuditLogs(0, 10);

        assertNotNull(response);
        assertTrue(response.data() instanceof Page);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditLogRepository).findAll(captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize());
    }

    @Test
    @DisplayName("C3 Regression: AuditLogController returns bounded List (max 200) when pagination is not provided")
    void getAllAuditLogs_withoutPagination_returnsBoundedList() {
        AuditLog log = AuditLog.builder()
                .id(2L)
                .action("UPDATE")
                .entityName("TASK")
                .entityId(2L)
                .userId(1L)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        Page<AuditLog> page = new PageImpl<>(List.of(log));

        when(auditLogRepository.findAll(any(Pageable.class))).thenReturn(page);

        ApiResponse<?> response = auditLogController.getAllAuditLogs(null, null);

        assertNotNull(response);
        assertTrue(response.data() instanceof List);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditLogRepository).findAll(captor.capture());
        assertEquals(200, captor.getValue().getPageSize());
    }
}
