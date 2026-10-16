package com.example.zhanfinancebackend.modules.crm.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ErrorCode;
import com.example.zhanfinancebackend.modules.auth.dto.UserDto;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.dto.ClientDto;
import com.example.zhanfinancebackend.modules.crm.entity.ClientProfile;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;

import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;

import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;

@Service
public class ClientService {

    private final ClientProfileRepository clientProfileRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final NotificationService notificationService;

    public ClientService(ClientProfileRepository clientProfileRepository, 
                         UserRepository userRepository,
                         TaskRepository taskRepository,
                         NotificationService notificationService) {
        this.clientProfileRepository = clientProfileRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public List<ClientDto> getAllClients() {
        
        List<User> clientsWithoutProfile = userRepository.findClientsWithoutProfile();
        for (User client : clientsWithoutProfile) {
            ensureProfile(client);
        }

        return clientProfileRepository.findAllWithUser().stream()
                .filter(p -> p.getUser() != null && p.getUser().getRole() == Role.CLIENT)
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClientDto> getClientsForEmployee(User employee) {
        return clientProfileRepository.findAllByUserAssignedEmployee(employee).stream().map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public ClientDto getClient(Long id) {
        return clientProfileRepository.findByIdWithUser(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Client profile not found"));
    }

    @Transactional(readOnly = true)
    public ClientProfile getClientProfileEntity(Long id) {
        return clientProfileRepository.findByIdWithUser(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client profile not found"));
    }

    @Transactional
    public void assignEmployeeToClient(Long clientId, Long employeeId) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        client.setAssignedEmployee(employee);
        userRepository.save(client);

        // Phase 2: Cascade ownership Client -> Active Tasks
        List<Task> activeTasks = taskRepository.findByClientIdAndArchivedFalse(client.getId());
        int cascadedCount = 0;
        for (Task task : activeTasks) {
            if (task.getAssignedTo() == null || !task.getAssignedTo().getId().equals(employee.getId())) {
                task.setAssignedTo(employee);
                taskRepository.save(task);
                cascadedCount++;
            }
        }

        if (cascadedCount > 0) {
            notificationService.createNotification(
                    employee,
                    "Каскадное назначение задач",
                    "За вами закреплён клиент " + client.getFullName() + ". Передано задач: " + cascadedCount,
                    "/employee/tasks"
            );
        }
    }

    @Transactional
    public ClientDto updateClientProfile(Long userId, String companyName, String phone, String notes) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ClientProfile profile = clientProfileRepository.findByUser(user).orElseGet(() -> new ClientProfile(user));
        profile.setCompanyName(companyName);
        profile.setPhone(phone);
        profile.setNotes(notes);

        return mapToDto(clientProfileRepository.save(profile));
    }

    public ClientDto mapToDto(ClientProfile profile) {
        if (profile == null) return null;
        return new ClientDto(
                profile.getId(),
                mapUserToDto(profile.getUser()),
                profile.getCompanyName(),
                profile.getPhone(),
                profile.getNotes(),
                profile.getUser() != null ? mapUserToDto(profile.getUser().getAssignedEmployee()) : null,
                profile.getCreatedAt() != null ? profile.getCreatedAt().atZone(ZoneOffset.UTC) : null,
                profile.getUpdatedAt() != null ? profile.getUpdatedAt().atZone(ZoneOffset.UTC) : null
        );
    }

    @Transactional
    public void ensureProfile(User user) {
        ensureProfile(user, null, null);
    }

    @Transactional
    public void ensureProfile(User user, String companyName, String phone) {
        ClientProfile profile = clientProfileRepository.findByUser(user)
                .orElseGet(() -> new ClientProfile(user));
        
        if (companyName != null && !companyName.isBlank()) {
            profile.setCompanyName(companyName);
        }
        if (phone != null && !phone.isBlank()) {
            profile.setPhone(phone);
        }
        
        clientProfileRepository.save(profile);
    }

    public UserDto mapUserToDto(User user) {
        if (user == null) return null;
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getRole(), user.getLocale());
    }
}
