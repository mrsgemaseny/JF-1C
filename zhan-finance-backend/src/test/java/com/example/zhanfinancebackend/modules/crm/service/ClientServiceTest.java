package com.example.zhanfinancebackend.modules.crm.service;

import com.example.zhanfinancebackend.common.exception.ApiException;
import com.example.zhanfinancebackend.common.exception.ResourceNotFoundException;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.entity.ClientProfile;
import com.example.zhanfinancebackend.modules.crm.repository.ClientProfileRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.notifications.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ClientServiceTest {

    private ClientService clientService;
    private ClientProfileRepository clientProfileRepository;
    private UserRepository userRepository;
    private TaskRepository taskRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        clientProfileRepository = mock(ClientProfileRepository.class);
        userRepository = mock(UserRepository.class);
        taskRepository = mock(TaskRepository.class);
        notificationService = mock(NotificationService.class);
        clientService = new ClientService(clientProfileRepository, userRepository, taskRepository, notificationService);
    }

    @Test
    void testEnsureProfile_CreatesNew() {
        User user = new User();
        user.setId(1L);

        when(clientProfileRepository.findByUser(user)).thenReturn(Optional.empty());

        clientService.ensureProfile(user);

        verify(clientProfileRepository).save(argThat(profile -> profile.getUser().equals(user)));
    }

    @Test
    void testEnsureProfile_NoDuplicate() {
        User user = new User();
        user.setId(1L);

        when(clientProfileRepository.findByUser(user)).thenReturn(Optional.of(new ClientProfile(user)));

        clientService.ensureProfile(user);

        verify(clientProfileRepository).save(any());
    }

    @Test
    void testAssignEmployeeToClient() {
        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);

        User employee = new User();
        employee.setId(2L);
        employee.setRole(Role.EMPLOYEE);

        ClientProfile profile = new ClientProfile(client);
        profile.setUser(client);

        when(userRepository.findById(1L)).thenReturn(Optional.of(client));
        when(userRepository.findById(2L)).thenReturn(Optional.of(employee));
        when(taskRepository.findByClientIdAndArchivedFalse(1L)).thenReturn(java.util.Collections.emptyList());

        clientService.assignEmployeeToClient(1L, 2L);

        assertEquals(employee, client.getAssignedEmployee());
        verify(userRepository).save(client);
    }

    @Test
    void testGetAllClients_UsesSingleBatchQuery() {
        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);

        ClientProfile profile = new ClientProfile(client);
        profile.setUser(client);

        when(userRepository.findClientsWithoutProfile()).thenReturn(java.util.Collections.emptyList());
        when(clientProfileRepository.findAllWithUser()).thenReturn(List.of(profile));

        var result = clientService.getAllClients();

        assertEquals(1, result.size());
        verify(userRepository).findClientsWithoutProfile();
        verify(userRepository, never()).findAllByRole(any());
        verify(clientProfileRepository).findAllWithUser();
    }
}
