package com.example.zhanfinancebackend.modules.chat.service;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.chat.repository.ChatMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatServiceTest {

    private ChatService chatService;
    private ChatMessageRepository chatMessageRepository;
    private UserRepository userRepository;
    private SimpMessagingTemplate messagingTemplate;

    @BeforeEach
    void setUp() {
        chatMessageRepository = mock(ChatMessageRepository.class);
        userRepository = mock(UserRepository.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        chatService = new ChatService(chatMessageRepository, userRepository, messagingTemplate);
    }

    @Test
    void testValidateAccess_AdminCanChatWithAnyone() {
        User admin = new User();
        admin.setId(1L);
        admin.setRole(Role.ADMIN);

        User client = new User();
        client.setId(2L);
        client.setRole(Role.CLIENT);

        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findById(2L)).thenReturn(Optional.of(client));

        assertDoesNotThrow(() -> chatService.getChatHistory(1L, 2L, null));
    }

    @Test
    void testValidateAccess_ClientCanChatWithAssignedEmployee() {
        User employee = new User();
        employee.setId(2L);
        employee.setRole(Role.EMPLOYEE);

        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);
        client.setAssignedEmployee(employee);

        when(userRepository.findById(1L)).thenReturn(Optional.of(client));
        when(userRepository.findById(2L)).thenReturn(Optional.of(employee));

        assertDoesNotThrow(() -> chatService.getChatHistory(1L, 2L, null));
    }

    @Test
    void clientCanSeeAndChatWithAllActiveEmployees() {
        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);

        User activeEmployee = new User();
        activeEmployee.setId(2L);
        activeEmployee.setRole(Role.EMPLOYEE);

        User disabledEmployee = new User();
        disabledEmployee.setId(3L);
        disabledEmployee.setRole(Role.EMPLOYEE);
        disabledEmployee.setEnabled(false);

        User deletedEmployee = new User();
        deletedEmployee.setId(4L);
        deletedEmployee.setRole(Role.EMPLOYEE);
        deletedEmployee.setDeletedAt(Instant.now());

        when(userRepository.findById(1L)).thenReturn(Optional.of(client));
        when(userRepository.findById(2L)).thenReturn(Optional.of(activeEmployee));
        when(userRepository.findAllByRoleIn(List.of(Role.ADMIN, Role.ADVISOR))).thenReturn(List.of());
        when(userRepository.findAllByRole(Role.EMPLOYEE)).thenReturn(List.of(activeEmployee, disabledEmployee, deletedEmployee));
        when(chatMessageRepository.countUnreadByReceiverGroupedBySender(1L)).thenReturn(List.of());
        when(chatMessageRepository.findLastMessagesForUser(1L)).thenReturn(List.of());

        List<com.example.zhanfinancebackend.modules.chat.dto.ChatContactDto> contacts = chatService.getContacts(1L);

        assertEquals(List.of(2L), contacts.stream().map(contact -> contact.id()).toList());
        assertDoesNotThrow(() -> chatService.getChatHistory(1L, 2L, null));
    }

    @Test
    void testValidateAccess_ClientCannotChatWithInactiveUnassignedEmployee() {
        User unassignedEmployee = new User();
        unassignedEmployee.setId(2L);
        unassignedEmployee.setRole(Role.EMPLOYEE);
        unassignedEmployee.setEnabled(false);

        User assignedEmployee = new User();
        assignedEmployee.setId(3L);
        assignedEmployee.setRole(Role.EMPLOYEE);

        User client = new User();
        client.setId(1L);
        client.setRole(Role.CLIENT);
        client.setAssignedEmployee(assignedEmployee);

        when(userRepository.findById(1L)).thenReturn(Optional.of(client));
        when(userRepository.findById(2L)).thenReturn(Optional.of(unassignedEmployee));

        org.springframework.security.access.AccessDeniedException ex = assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () -> chatService.getChatHistory(1L, 2L, null)
        );
        assertEquals("Client can only chat with active employees, admins, or advisors", ex.getMessage());
    }

    @Test
    void testValidateAccess_EmployeeCannotChatWithUnassignedClient() {
        User employee = new User();
        employee.setId(1L);
        employee.setRole(Role.EMPLOYEE);

        User client = new User();
        client.setId(2L);
        client.setRole(Role.CLIENT);
        User otherEmployee = new User();
        otherEmployee.setId(3L);
        client.setAssignedEmployee(otherEmployee);

        when(userRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(userRepository.findById(2L)).thenReturn(Optional.of(client));

        org.springframework.security.access.AccessDeniedException ex = assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () -> chatService.getChatHistory(1L, 2L, null)
        );
        assertEquals("Employee can only chat with their assigned clients", ex.getMessage());
    }
}
