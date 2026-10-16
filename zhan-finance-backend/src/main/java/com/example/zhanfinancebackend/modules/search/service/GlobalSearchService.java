package com.example.zhanfinancebackend.modules.search.service;

import com.example.zhanfinancebackend.modules.auth.dto.UserDto;
import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.crm.dto.TaskDto;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import com.example.zhanfinancebackend.modules.crm.service.TaskService;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.entity.Lesson;
import com.example.zhanfinancebackend.modules.courses.repository.CourseRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonRepository;
import com.example.zhanfinancebackend.modules.courses.dto.CourseDto;
import com.example.zhanfinancebackend.modules.courses.dto.LessonDto;
import com.example.zhanfinancebackend.modules.search.dto.GlobalSearchResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.example.zhanfinancebackend.modules.courses.entity.CourseStatus;
import com.example.zhanfinancebackend.modules.crm.mapper.TaskMapper;

@Service
public class GlobalSearchService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskMapper taskMapper;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;

    public GlobalSearchService(TaskRepository taskRepository, UserRepository userRepository, TaskMapper taskMapper, CourseRepository courseRepository, LessonRepository lessonRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.taskMapper = taskMapper;
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
    }

    @Transactional(readOnly = true)
    public GlobalSearchResponse search(User user, String query) {
        if (query == null || query.trim().length() < 2 || user == null) {
            return new GlobalSearchResponse(List.of(), List.of(), List.of(), List.of());
        }

        List<TaskDto> taskDtos = searchTasks(user, query);
        List<UserDto> userDtos = searchUsers(user, query);
        List<CourseDto> courseDtos = Collections.emptyList();
        List<LessonDto> lessonDtos = Collections.emptyList();

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.LEARNER) {
            courseDtos = searchCourses(user, query);
            lessonDtos = searchLessons(user, query);
        }

        return new GlobalSearchResponse(taskDtos, userDtos, courseDtos, lessonDtos);
    }

    private List<TaskDto> searchTasks(User user, String query) {
        return taskRepository.searchTasks(query).stream()
                .filter(t -> canAccessTask(user, t))
                .map(taskMapper::mapToDto)
                .collect(Collectors.toList());
    }

    private boolean canAccessTask(User user, Task t) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.ADVISOR) return true;
        if (user.getRole() == Role.EMPLOYEE) {
            return t.getAssignedTo() != null && t.getAssignedTo().getId().equals(user.getId()) ||
                    (t.getClient() != null && t.getClient().getAssignedEmployee() != null && t.getClient().getAssignedEmployee().getId().equals(user.getId()));
        }
        if (user.getRole() == Role.CLIENT) {
            return t.getClient() != null && t.getClient().getId().equals(user.getId()) || 
                   (t.getCreatedBy() != null && t.getCreatedBy().getId().equals(user.getId()));
        }
        return false;
    }

    private List<UserDto> searchUsers(User user, String query) {
        return userRepository.searchUsers(query).stream()
                .filter(u -> canAccessUser(user, u))
                .map(u -> new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.getLocale()))
                .collect(Collectors.toList());
    }

    private boolean canAccessUser(User user, User u) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.ADVISOR) return true;
        if (user.getRole() == Role.EMPLOYEE) {
            return u.getRole() == Role.CLIENT && u.getAssignedEmployee() != null && u.getAssignedEmployee().getId().equals(user.getId());
        }
        if (user.getRole() == Role.CLIENT) {
            return u.getRole() == Role.EMPLOYEE && user.getAssignedEmployee() != null && u.getId().equals(user.getAssignedEmployee().getId());
        }
        return false;
    }


    private List<CourseDto> searchCourses(User user, String query) {
        List<Course> foundCourses = user.getRole() == Role.ADMIN ? 
            courseRepository.searchCourses(query) : 
            courseRepository.searchPublishedCourses(query);
            
        return foundCourses.stream().map(this::mapToCourseDto).collect(Collectors.toList());
    }

    private List<LessonDto> searchLessons(User user, String query) {
        return lessonRepository.searchLessons(query).stream()
            .filter(l -> {
                if (user.getRole() == Role.ADMIN) return true;
                if (l.getChapter() != null && l.getChapter().getCourse() != null) {
                    return l.getChapter().getCourse().getStatus() == CourseStatus.PUBLISHED;
                }
                return false;
            })
            .map(this::mapToLessonDto)
            .collect(Collectors.toList());
    }

    private CourseDto mapToCourseDto(Course c) {
        CourseDto dto = new CourseDto();
        dto.setId(c.getId());
        dto.setTitle(c.getTitle());
        dto.setDescription(c.getDescription());
        dto.setThumbnail(c.getThumbnail());
        dto.setStatus(c.getStatus());
        if (c.getCreatedAt() != null) {
            dto.setCreatedAt(java.time.LocalDateTime.ofInstant(c.getCreatedAt(), java.time.ZoneId.systemDefault()));
        }
        if (c.getCreatedBy() != null) dto.setCreatedById(c.getCreatedBy().getId());
        return dto;
    }

    private LessonDto mapToLessonDto(Lesson l) {
        LessonDto dto = new LessonDto();
        dto.setId(l.getId());
        if (l.getChapter() != null) {
            dto.setChapterId(l.getChapter().getId());
            if (l.getChapter().getCourse() != null) {
                dto.setCourseId(l.getChapter().getCourse().getId());
            }
        }
        dto.setTitle(l.getTitle());
        dto.setDescription(l.getDescription());
        dto.setType(l.getType());
        dto.setOrderIndex(l.getOrderIndex());
        return dto;
    }
}
