package com.example.zhanfinancebackend.modules.search.service;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.courses.repository.CourseRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonRepository;
import com.example.zhanfinancebackend.modules.crm.mapper.TaskMapper;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalSearchServiceTest {

    @Test
    void clientSearchReturnsAllActiveEmployeesMatchingTheirNames() {
        TaskRepository taskRepository = mock(TaskRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        GlobalSearchService service = new GlobalSearchService(
                taskRepository,
                userRepository,
                mock(TaskMapper.class),
                mock(CourseRepository.class),
                mock(LessonRepository.class)
        );

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

        when(taskRepository.searchTasks("accountant")).thenReturn(List.of());
        when(userRepository.searchUsers("accountant"))
                .thenReturn(List.of(activeEmployee, disabledEmployee, deletedEmployee));

        var result = service.search(client, "accountant");

        assertEquals(List.of(2L), result.users().stream().map(user -> user.id()).toList());
    }
}
