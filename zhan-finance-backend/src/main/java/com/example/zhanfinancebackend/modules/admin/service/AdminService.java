package com.example.zhanfinancebackend.modules.admin.service;

import com.example.zhanfinancebackend.modules.auth.entity.RegistrationStatus;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.dto.AdminDashboardDto;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeDto;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest;
import com.example.zhanfinancebackend.modules.auth.mapper.UserMapper;
import com.example.zhanfinancebackend.modules.crm.dto.ClientStatsDto;
import com.example.zhanfinancebackend.modules.crm.dto.EmployeeWorkloadDto;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.notifications.service.EmailNotificationService;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;

import com.example.zhanfinancebackend.modules.auth.service.RefreshTokenService;
import com.example.zhanfinancebackend.modules.audit.service.AuditService;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ClientProfileRepository clientRepository;
    private final TaskRepository taskRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final EmailNotificationService emailNotificationService;
    private final NotificationService notificationService;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;

    public AdminService(
            UserRepository userRepository,
            ClientProfileRepository clientRepository,
            TaskRepository taskRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            UserMapper userMapper,
            EmailNotificationService emailNotificationService,
            NotificationService notificationService,
            RefreshTokenService refreshTokenService,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.taskRepository = taskRepository;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
        this.emailNotificationService = emailNotificationService;
        this.notificationService = notificationService;
        this.refreshTokenService = refreshTokenService;
        this.auditService = auditService;
    }

    public List<EmployeeDto> getAllEmployees() {
        return userRepository.findAllByRoleIn(List.of(Role.EMPLOYEE, Role.ADVISOR)).stream()
                .filter(u -> u.getDeletedAt() == null)
                .map(userMapper::mapToEmployeeDto)
                .toList();
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public void promoteToAdvisor(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));
        if (user.getRole() != Role.EMPLOYEE && user.getRole() != Role.ADVISOR) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Only employees can be promoted to ADVISOR");
        }
        user.setRole(Role.ADVISOR);
        userRepository.save(user);

        // Detach all assigned clients
        List<User> assignedClients = userRepository.findAllByAssignedEmployee(user);
        for (User client : assignedClients) {
            client.setAssignedEmployee(null);
            userRepository.save(client);
        }

        // Detach all assigned active tasks
        List<Task> assignedTasks = taskRepository.findAllByEmployeeWithDetails(user);
        for (Task task : assignedTasks) {
            task.setAssignedTo(null);
            taskRepository.save(task);
        }

        refreshTokenService.revokeAll(user);
        auditService.logAction("PROMOTE_TO_ADVISOR", "User", user.getId(), 
            "User " + user.getEmail() + " promoted to ADVISOR. Unassigned " + assignedClients.size() + " clients and " + assignedTasks.size() + " tasks.");
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public void demoteToEmployee(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));
        if (user.getRole() != Role.ADVISOR) {
            throw new ApiException(ErrorCode.BAD_REQUEST, "Only ADVISORs can be demoted to EMPLOYEE");
        }
        user.setRole(Role.EMPLOYEE);
        userRepository.save(user);
        refreshTokenService.revokeAll(user);
        auditService.logAction("DEMOTE_TO_EMPLOYEE", "User", user.getId(), "User " + user.getEmail() + " demoted to EMPLOYEE");
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public void toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
        if (!user.isEnabled()) {
            refreshTokenService.revokeAll(user);
        }
        auditService.logAction("TOGGLE_USER_STATUS", "User", user.getId(), "User " + user.getEmail() + " status toggled to " + user.isEnabled());
    }

    public List<EmployeeDto> getPendingEmployees() {
        return userRepository.findAllByRoleInAndRegistrationStatus(List.of(Role.EMPLOYEE, Role.ADVISOR), RegistrationStatus.PENDING).stream()
                .map(userMapper::mapToEmployeeDto)
                .toList();
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public void approveEmployee(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND, "User not found"));
        if (user.getRole() != Role.EMPLOYEE && user.getRole() != Role.ADMIN && user.getRole() != Role.CURATOR && user.getRole() != Role.ADVISOR) {
            throw new ApiException(
                    ErrorCode.BAD_REQUEST,
                    "Only staff accounts can be approved");
        }
        user.setEnabled(true);
        user.setRegistrationStatus(RegistrationStatus.APPROVED);
        userRepository.save(user);
        emailNotificationService.sendAccountApprovedEmail(user);
        notificationService.createNotification(
                user,
                "Аккаунт подтвержден",
                "Ваш аккаунт был успешно подтвержден администратором.",
                "/login"
        );
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard_admin", "dashboard_employee", "dashboard_client"}, allEntries = true)
    public void rejectEmployee(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND, "User not found"));
        if (user.getRole() != Role.EMPLOYEE && user.getRole() != Role.ADMIN && user.getRole() != Role.CURATOR && user.getRole() != Role.ADVISOR) {
            throw new ApiException(
                    ErrorCode.BAD_REQUEST,
                    "Only staff accounts can be rejected");
        }
        user.setEnabled(false);
        user.setRegistrationStatus(RegistrationStatus.REJECTED);
        userRepository.save(user);
    }

    public List<EmployeeDto> getAssignedEmployees() {
        return userRepository.findAssignedEmployees().stream()
                .map(userMapper::mapToEmployeeDto)
                .toList();
    }

    public List<EmployeeDto> getUnassignedEmployees() {
        return userRepository.findUnassignedEmployees().stream()
                .map(userMapper::mapToEmployeeDto)
                .toList();
    }

    public List<EmployeeWorkloadDto> getEmployeeWorkloads() {
        return userRepository.getEmployeeWorkloads();
    }

    public AdminDashboardDto getAdminDashboard() {
        long clientsCount = userRepository.countByRole(Role.CLIENT);
        long employeesCount = userRepository.countByRole(Role.EMPLOYEE);
        
        // This will be replaced in DashboardService, but since it's duplicated in AdminService...
        // Wait, AdminService also has getAdminDashboard which fetches ALL tasks. I should defer this or redirect to DashboardService.
        // I will change it to return empty or just use DashboardService here later.
        long tasksCount = taskRepository.count();
        
        java.util.Map<String, Long> tasksByStatus = new java.util.HashMap<>();
        for (java.util.Map<String, Object> map : taskRepository.countTasksByStatus()) {
            String statusName = map.get("statusName") != null ? map.get("statusName").toString() : "Unknown";
            Long count = ((Number) map.get("count")).longValue();
            tasksByStatus.put(statusName, count);
        }
                
        return new AdminDashboardDto(clientsCount, employeesCount, tasksCount, 0L, 0L, 0.0, tasksByStatus, java.util.Collections.emptyMap(), userRepository.count(), 0L, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.util.Collections.emptyList());
    }

    public List<ClientStatsDto> getClientStats() {
        return taskRepository.getClientStats();
    }

    public List<EmployeeDto> getAllLearners() {
        return userRepository.findAllByRole(Role.LEARNER).stream()
                .map(userMapper::mapToEmployeeDto)
                .toList();
    }

    @Transactional
    public void createLearner(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException(
                    ErrorCode.BAD_REQUEST, "Email уже используется");
        }
        User user = new User(
                request.fullName(),
                request.email().toLowerCase(),
                passwordEncoder.encode(request.password()),
                Role.LEARNER
        );
        user.setEnabled(true);
        userRepository.save(user);
    }
}
