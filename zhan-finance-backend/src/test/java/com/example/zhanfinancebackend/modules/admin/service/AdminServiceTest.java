package com.example.zhanfinancebackend.modules.admin.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.modules.audit.service.AuditService;
import com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.mapper.UserMapper;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.auth.service.RefreshTokenService;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeWorkloadDto;
import com.example.zhanfinancebackend.modules.crm.dto.TaskRequestCreateRequest;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.crm.service.TaskService;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminServiceTest {

    private AdminService adminService;
    private UserRepository userRepository;
    private ClientProfileRepository clientRepository;
    private TaskRepository taskRepository;
    private PasswordEncoder passwordEncoder;
    private UserMapper userMapper;
    private EmailNotificationService emailNotificationService;
    private NotificationService notificationService;
    private RefreshTokenService refreshTokenService;
    private AuditService auditService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        clientRepository = mock(ClientProfileRepository.class);
        taskRepository = mock(TaskRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        userMapper = mock(UserMapper.class);
        emailNotificationService = mock(EmailNotificationService.class);
        notificationService = mock(NotificationService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        auditService = mock(AuditService.class);

        adminService = new AdminService(
                userRepository, clientRepository, taskRepository, passwordEncoder,
                userMapper, emailNotificationService, notificationService,
                refreshTokenService, auditService
        );
    }

    @Test
    @DisplayName("All mutation methods in AdminService must have @Transactional annotation")
    void testMutationMethodsHaveTransactionalAnnotation() throws Exception {
        Method promote = AdminService.class.getMethod("promoteToAdvisor", Long.class);
        Method demote = AdminService.class.getMethod("demoteToEmployee", Long.class);
        Method toggle = AdminService.class.getMethod("toggleUserStatus", Long.class);
        Method approve = AdminService.class.getMethod("approveEmployee", Long.class);
        Method reject = AdminService.class.getMethod("rejectEmployee", Long.class);
        Method createLearner = AdminService.class.getMethod("createLearner", RegisterRequest.class);

        assertTrue(promote.isAnnotationPresent(Transactional.class),
                "promoteToAdvisor must be annotated with @Transactional");
        assertTrue(demote.isAnnotationPresent(Transactional.class),
                "demoteToEmployee must be annotated with @Transactional");
        assertTrue(toggle.isAnnotationPresent(Transactional.class),
                "toggleUserStatus must be annotated with @Transactional");
        assertTrue(approve.isAnnotationPresent(Transactional.class),
                "approveEmployee must be annotated with @Transactional");
        assertTrue(reject.isAnnotationPresent(Transactional.class),
                "rejectEmployee must be annotated with @Transactional");
        assertTrue(createLearner.isAnnotationPresent(Transactional.class),
                "createLearner must be annotated with @Transactional");
    }

    @Test
    @DisplayName("TaskService.requestTask must have @Transactional annotation")
    void testTaskServiceRequestTaskHasTransactionalAnnotation() throws Exception {
        Method requestTask = TaskService.class.getMethod("requestTask", TaskRequestCreateRequest.class, User.class);
        assertTrue(requestTask.isAnnotationPresent(Transactional.class),
                "TaskService.requestTask must be annotated with @Transactional");
    }

    @Test
    @DisplayName("promoteToAdvisor promotes employee, unassigns clients and tasks, revokes tokens, and logs audit")
    void testPromoteToAdvisor_Success() {
        User employee = new User();
        employee.setId(10L);
        employee.setEmail("emp@example.com");
        employee.setRole(Role.EMPLOYEE);

        User assignedClient = new User();
        assignedClient.setId(20L);
        assignedClient.setAssignedEmployee(employee);

        Task assignedTask = new Task();
        assignedTask.setId(30L);
        assignedTask.setAssignedTo(employee);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(userRepository.findAllByAssignedEmployee(employee)).thenReturn(List.of(assignedClient));
        when(taskRepository.findAllByEmployeeWithDetails(employee)).thenReturn(List.of(assignedTask));

        adminService.promoteToAdvisor(10L);

        assertEquals(Role.ADVISOR, employee.getRole());
        assertNull(assignedClient.getAssignedEmployee());
        assertNull(assignedTask.getAssignedTo());

        verify(userRepository).save(employee);
        verify(userRepository).save(assignedClient);
        verify(taskRepository).save(assignedTask);
        verify(refreshTokenService).revokeAll(employee);
        verify(auditService).logAction(eq("PROMOTE_TO_ADVISOR"), eq("User"), eq(10L), contains("promoted to ADVISOR"));
    }

    @Test
    @DisplayName("promoteToAdvisor throws exception when user is not an EMPLOYEE or ADVISOR")
    void testPromoteToAdvisor_InvalidRole() {
        User client = new User();
        client.setId(10L);
        client.setRole(Role.CLIENT);

        when(userRepository.findById(10L)).thenReturn(Optional.of(client));

        ApiException ex = assertThrows(ApiException.class, () -> adminService.promoteToAdvisor(10L));
        assertEquals("Only employees can be promoted to ADVISOR", ex.getMessage());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    @DisplayName("promoteToAdvisor throws exception when user not found")
    void testPromoteToAdvisor_NotFound() {
        when(userRepository.findById(10L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> adminService.promoteToAdvisor(10L));
        assertEquals("User not found", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("demoteToEmployee updates role to EMPLOYEE, revokes tokens, and logs audit action")
    void testDemoteToEmployee_Success() {
        User advisor = new User();
        advisor.setId(2L);
        advisor.setEmail("advisor@example.com");
        advisor.setRole(Role.ADVISOR);

        when(userRepository.findById(2L)).thenReturn(Optional.of(advisor));

        adminService.demoteToEmployee(2L);

        assertEquals(Role.EMPLOYEE, advisor.getRole());
        verify(userRepository).save(advisor);
        verify(refreshTokenService).revokeAll(advisor);
        verify(auditService).logAction(eq("DEMOTE_TO_EMPLOYEE"), eq("User"), eq(2L), contains("demoted to EMPLOYEE"));
    }

    @Test
    @DisplayName("demoteToEmployee throws exception when user is not an ADVISOR")
    void testDemoteToEmployee_InvalidRole() {
        User employee = new User();
        employee.setId(2L);
        employee.setRole(Role.EMPLOYEE);

        when(userRepository.findById(2L)).thenReturn(Optional.of(employee));

        ApiException ex = assertThrows(ApiException.class, () -> adminService.demoteToEmployee(2L));
        assertEquals("Only ADVISORs can be demoted to EMPLOYEE", ex.getMessage());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    @DisplayName("demoteToEmployee throws exception when user not found")
    void testDemoteToEmployee_NotFound() {
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> adminService.demoteToEmployee(2L));
        assertEquals("User not found", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("toggleUserStatus disables enabled user, revokes tokens, and logs audit action")
    void testToggleUserStatus_DisableUser() {
        User activeUser = new User();
        activeUser.setId(3L);
        activeUser.setEmail("active@example.com");
        activeUser.setEnabled(true);

        when(userRepository.findById(3L)).thenReturn(Optional.of(activeUser));

        adminService.toggleUserStatus(3L);

        assertFalse(activeUser.isEnabled());
        verify(userRepository).save(activeUser);
        verify(refreshTokenService).revokeAll(activeUser);
        verify(auditService).logAction(eq("TOGGLE_USER_STATUS"), eq("User"), eq(3L), contains("status toggled to false"));
    }

    @Test
    @DisplayName("toggleUserStatus enables disabled user without revoking tokens")
    void testToggleUserStatus_EnableUser() {
        User disabledUser = new User();
        disabledUser.setId(4L);
        disabledUser.setEmail("disabled@example.com");
        disabledUser.setEnabled(false);

        when(userRepository.findById(4L)).thenReturn(Optional.of(disabledUser));

        adminService.toggleUserStatus(4L);

        assertTrue(disabledUser.isEnabled());
        verify(userRepository).save(disabledUser);
        verify(refreshTokenService, never()).revokeAll(any());
        verify(auditService).logAction(eq("TOGGLE_USER_STATUS"), eq("User"), eq(4L), contains("status toggled to true"));
    }

    @Test
    @DisplayName("toggleUserStatus throws exception when user not found")
    void testToggleUserStatus_NotFound() {
        when(userRepository.findById(4L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> adminService.toggleUserStatus(4L));
        assertEquals("User not found", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("approveEmployee approves staff account, sends email, and creates notification")
    void testApproveEmployee() {
        User employee = new User();
        employee.setId(1L);
        employee.setRole(Role.EMPLOYEE);
        employee.setEnabled(false);

        when(userRepository.findById(1L)).thenReturn(Optional.of(employee));

        adminService.approveEmployee(1L);

        assertTrue(employee.isEnabled());
        verify(userRepository).save(employee);
        verify(emailNotificationService).sendAccountApprovedEmail(employee);
        verify(notificationService).createNotification(eq(employee), anyString(), anyString(), eq("/login"));
    }

    @Test
    @DisplayName("approveEmployee throws exception when role is not staff")
    void testApproveEmployee_InvalidRole() {
        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);

        when(userRepository.findById(1L)).thenReturn(Optional.of(client));

        ApiException exception = assertThrows(ApiException.class, () -> {
            adminService.approveEmployee(1L);
        });

        assertEquals("Only staff accounts can be approved", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("approveEmployee throws exception when user not found")
    void testApproveEmployee_NotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> {
            adminService.approveEmployee(1L);
        });

        assertEquals("User not found", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("rejectEmployee rejects staff account and disables user")
    void testRejectEmployee() {
        User employee = new User();
        employee.setId(1L);
        employee.setRole(Role.EMPLOYEE);
        employee.setEnabled(true);

        when(userRepository.findById(1L)).thenReturn(Optional.of(employee));

        adminService.rejectEmployee(1L);

        assertFalse(employee.isEnabled());
        verify(userRepository).save(employee);
    }

    @Test
    @DisplayName("rejectEmployee throws exception when role is not staff")
    void testRejectEmployee_InvalidRole() {
        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);

        when(userRepository.findById(1L)).thenReturn(Optional.of(client));

        ApiException exception = assertThrows(ApiException.class, () -> {
            adminService.rejectEmployee(1L);
        });

        assertEquals("Only staff accounts can be rejected", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("rejectEmployee throws exception when user not found")
    void testRejectEmployee_NotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> {
            adminService.rejectEmployee(1L);
        });

        assertEquals("User not found", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("createLearner creates and saves new LEARNER user with encoded password")
    void testCreateLearner_Success() {
        RegisterRequest request = new RegisterRequest("Learner Name", "learner@example.com", "secret123", Role.LEARNER, null, null);
        when(userRepository.existsByEmailIgnoreCase("learner@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("encodedSecret");

        adminService.createLearner(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("Learner Name", saved.getFullName());
        assertEquals("learner@example.com", saved.getEmail());
        assertEquals("encodedSecret", saved.getPasswordHash());
        assertEquals(Role.LEARNER, saved.getRole());
        assertTrue(saved.isEnabled());
    }

    @Test
    @DisplayName("createLearner throws exception on duplicate email")
    void testCreateLearner_DuplicateEmail() {
        RegisterRequest request = new RegisterRequest("Learner Name", "existing@example.com", "secret123", Role.LEARNER, null, null);
        when(userRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> adminService.createLearner(request));
        assertEquals("Email уже используется", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("getEmployeeWorkloads returns employee workload DTO list")
    void testGetEmployeeWorkloads() {
        EmployeeWorkloadDto dto1 = new EmployeeWorkloadDto(1L, "Employee 1", "emp1@example.com", 5);
        EmployeeWorkloadDto dto2 = new EmployeeWorkloadDto(2L, "Employee 2", "emp2@example.com", 2);

        when(userRepository.getEmployeeWorkloads()).thenReturn(List.of(dto1, dto2));

        List<EmployeeWorkloadDto> result = adminService.getEmployeeWorkloads();

        assertEquals(2, result.size());
        assertEquals(5, result.get(0).activeTasksCount());
        verify(userRepository).getEmployeeWorkloads();
    }
}
