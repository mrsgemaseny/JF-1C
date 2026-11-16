package com.example.zhanfinancebackend.modules.crm;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.billing.dto.SubscriptionDto;
import com.example.zhanfinancebackend.modules.billing.entity.Subscription;
import com.example.zhanfinancebackend.modules.billing.repository.SubscriptionRepository;
import com.example.zhanfinancebackend.modules.billing.service.SubscriptionService;
import com.example.zhanfinancebackend.modules.crm.dto.AdminDashboardDto;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import com.example.zhanfinancebackend.modules.landing.repository.ContactRequestRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.crm.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NullSafetyDashboardAndBillingRegressionTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClientProfileRepository clientRepository;

    @Mock
    private ContactRequestRepository contactRequestRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private SubscriptionService subscriptionService;

    @Test
    @DisplayName("W8 Regression: DashboardService handles NULL lostReason without NullPointerException")
    void getAdminDashboard_withNullLostReason_doesNotThrow() {
        when(taskRepository.count()).thenReturn(10L);
        when(taskRepository.countTasksByStageType(StageType.WON)).thenReturn(5L);
        when(taskRepository.countTasksByStageType(StageType.LOST)).thenReturn(2L);
        when(contactRequestRepository.countByCreatedAtAfter(any())).thenReturn(1L);
        when(taskRepository.sumWonAmount()).thenReturn(BigDecimal.valueOf(1000));
        when(taskRepository.sumExpectedAmount()).thenReturn(BigDecimal.valueOf(2000));
        when(taskRepository.getAverageCompletionDays()).thenReturn(3.5);
        when(taskRepository.countTasksByStatus()).thenReturn(Collections.emptyList());

        Map<String, Object> nullReasonRow = new HashMap<>();
        nullReasonRow.put("reason", null);
        nullReasonRow.put("count", 2L);
        when(taskRepository.countTasksByLostReason()).thenReturn(List.of(nullReasonRow));

        when(userRepository.findAllByRole(Role.EMPLOYEE)).thenReturn(Collections.emptyList());
        when(taskRepository.getEmployeeTaskStats()).thenReturn(Collections.emptyList());
        when(taskRepository.getAverageCompletionDaysPerEmployee()).thenReturn(Collections.emptyList());
        when(userRepository.count()).thenReturn(5L);

        AdminDashboardDto dashboard = assertDoesNotThrow(() -> dashboardService.getAdminDashboard());
        assertNotNull(dashboard);
        assertTrue(dashboard.tasksByLostReason().containsKey("Не указана"));
        assertEquals(2L, dashboard.tasksByLostReason().get("Не указана"));
    }

    @Test
    @DisplayName("W8 Regression: SubscriptionService.create handles NULL endsAt without NullPointerException")
    void subscriptionService_createWithNullEndsAt_doesNotThrow() {
        User user = new User();
        user.setId(1L);
        user.setEmail("client@example.com");

        Subscription existingOpenEnded = new Subscription(
                user, "Basic Plan", BigDecimal.valueOf(50000), LocalDate.now().minusMonths(1), null
        );
        existingOpenEnded.setId(10L);

        // when(subscriptionRepository.findAllByUser(user)).thenReturn(List.of(existingOpenEnded));
        SubscriptionDto newRequest = new SubscriptionDto(
                null, "Pro Plan", BigDecimal.valueOf(100000), Subscription.SubscriptionStatus.ACTIVE, LocalDate.now(), null
        );
        when(subscriptionRepository.existsOverlappingSubscription(user, null, newRequest.startsAt(), newRequest.endsAt())).thenReturn(true);

        // When creating an overlapping subscription, it should throw ApiException(BAD_REQUEST) rather than NullPointerException
        com.example.zhanfinancebackend.common.exception.ApiException ex = assertThrows(
                com.example.zhanfinancebackend.common.exception.ApiException.class,
                () -> subscriptionService.create(user, newRequest)
        );

        assertEquals(com.example.zhanfinancebackend.common.exception.ErrorCode.BAD_REQUEST, ex.getErrorCode());
    }
}
