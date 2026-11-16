package com.example.zhanfinancebackend.modules.crm;

import com.example.zhanfinancebackend.modules.admin.service.AdminService;
import com.example.zhanfinancebackend.modules.crm.controller.PipelineController;
import com.example.zhanfinancebackend.modules.crm.dto.StageCreateRequest;
import com.example.zhanfinancebackend.modules.crm.dto.StageUpdateRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.CacheEvict;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CacheEvictAnnotationsRegressionTest {

    @Test
    @DisplayName("W3 Regression: AdminService mutation methods have @CacheEvict configured")
    void adminServiceMethods_haveCacheEvict() throws Exception {
        List<String> methodNames = List.of(
                "promoteToAdvisor",
                "demoteToEmployee",
                "toggleUserStatus",
                "approveEmployee",
                "rejectEmployee"
        );

        for (String methodName : methodNames) {
            Method method = Arrays.stream(AdminService.class.getDeclaredMethods())
                    .filter(m -> m.getName().equals(methodName))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("Method " + methodName + " not found in AdminService"));

            assertTrue(method.isAnnotationPresent(CacheEvict.class),
                    "Method " + methodName + " must have @CacheEvict");
            CacheEvict evict = method.getAnnotation(CacheEvict.class);
            assertTrue(evict.allEntries(), "Method " + methodName + " CacheEvict must have allEntries=true");
            assertTrue(Arrays.asList(evict.value()).contains("dashboard_admin"));
        }
    }

    @Test
    @DisplayName("W3 Regression: PipelineController stage mutation endpoints have @CacheEvict configured")
    void pipelineControllerMethods_haveCacheEvict() throws Exception {
        Method createStage = PipelineController.class.getMethod("createStage", Long.class, StageCreateRequest.class);
        Method updateStage = PipelineController.class.getMethod("updateStage", Long.class, Long.class, StageUpdateRequest.class);
        Method deleteStage = PipelineController.class.getMethod("deleteStage", Long.class, Long.class);

        for (Method method : List.of(createStage, updateStage, deleteStage)) {
            assertTrue(method.isAnnotationPresent(CacheEvict.class),
                    "PipelineController method " + method.getName() + " must have @CacheEvict");
            CacheEvict evict = method.getAnnotation(CacheEvict.class);
            assertTrue(evict.allEntries());
            assertTrue(Arrays.asList(evict.value()).contains("dashboard_admin"));
        }
    }
}
