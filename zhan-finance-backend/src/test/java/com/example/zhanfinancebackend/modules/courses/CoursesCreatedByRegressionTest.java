package com.example.zhanfinancebackend.modules.courses;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.entity.CourseStatus;
import com.example.zhanfinancebackend.modules.courses.repository.CourseRepository;
import com.example.zhanfinancebackend.modules.courses.service.CourseService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.JoinColumn;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class CoursesCreatedByRegressionTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseService courseService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("C4 Regression: V119 migration file exists in classpath and has valid backfill SQL")
    void v119MigrationFile_existsAndIsValid() throws Exception {
        ClassPathResource resource = new ClassPathResource("db/migration/V119__fix_courses_created_by_null.sql");
        assertTrue(resource.exists(), "Migration V119 must exist in db/migration classpath");

        try (InputStream is = resource.getInputStream()) {
            String sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(sql.contains("UPDATE courses"), "V119 must contain UPDATE courses statement");
            assertTrue(sql.contains("UPDATE course_curators"), "V119 must contain UPDATE course_curators statement");
            assertTrue(sql.contains("WHERE created_by IS NULL"), "V119 courses update must target NULL created_by");
            assertTrue(sql.contains("WHERE assigned_by IS NULL"), "V119 course_curators update must target NULL assigned_by");
        }
    }

    @Test
    @DisplayName("C4 Regression: All existing courses must have valid non-null createdBy")
    void allCourses_mustHaveValidCreatedBy() {
        List<Course> courses = courseRepository.findAll();
        for (Course course : courses) {
            assertNotNull(course.getCreatedBy(), "Course '" + course.getTitle() + "' must have non-null createdBy");
            assertNotNull(course.getCreatedBy().getId(), "Course creator must have a valid user ID");
        }
    }

    @Test
    @DisplayName("C4 Regression: V119 SQL update queries execute safely and idempotently")
    void v119SqlUpdateQuery_executesSafely() {
        // Ensure at least one admin exists
        User admin = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .findFirst()
                .orElseGet(() -> {
                    User newAdmin = new User("admin_test_c4@zhanfinance.kz", "hash", "Admin Test", Role.ADMIN);
                    return userRepository.save(newAdmin);
                });

        assertNotNull(admin.getId());

        // Execute the backfill logic from V119 for courses
        assertDoesNotThrow(() -> {
            jdbcTemplate.update("""
                UPDATE courses
                SET created_by = (
                    SELECT id
                    FROM app_users
                    WHERE role = 'ADMIN'
                    ORDER BY id ASC
                    LIMIT 1
                )
                WHERE created_by IS NULL
                  AND EXISTS (
                    SELECT 1
                    FROM app_users
                    WHERE role = 'ADMIN'
                )
            """);
        });

        // Execute the backfill logic from V119 for course_curators
        assertDoesNotThrow(() -> {
            jdbcTemplate.update("""
                UPDATE course_curators
                SET assigned_by = (
                    SELECT id
                    FROM app_users
                    WHERE role = 'ADMIN'
                    ORDER BY id ASC
                    LIMIT 1
                )
                WHERE assigned_by IS NULL
                  AND EXISTS (
                    SELECT 1
                    FROM app_users
                    WHERE role = 'ADMIN'
                )
            """);
        });
    }

    @Test
    @DisplayName("C4 Regression: Course entity mapping enforces non-null created_by column")
    void courseEntity_enforcesNonNullCreatedByMapping() throws NoSuchFieldException {
        Field createdByField = Course.class.getDeclaredField("createdBy");
        JoinColumn joinColumn = createdByField.getAnnotation(JoinColumn.class);

        assertNotNull(joinColumn, "createdBy field must be annotated with @JoinColumn");
        assertEquals("created_by", joinColumn.name(), "JoinColumn name must be 'created_by'");
        assertFalse(joinColumn.nullable(), "JoinColumn created_by must not be nullable");

        // Saving a course with null createdBy must fail at DB flush
        Course invalidCourse = new Course();
        invalidCourse.setTitle("Invalid Course without creator");
        invalidCourse.setStatus(CourseStatus.DRAFT);
        invalidCourse.setCreatedBy(null);

        assertThrows(Exception.class, () -> {
            courseRepository.save(invalidCourse);
            entityManager.flush();
        }, "Persisting course with null createdBy must throw persistence/integrity violation");
    }

    @Test
    @DisplayName("C4 Regression: Course creation via CourseService assigns non-null admin created_by")
    void courseCreationViaCourseService_assignsAdminCreatedBy() {
        User admin = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .findFirst()
                .orElseGet(() -> {
                    User newAdmin = new User("admin_service_test@zhanfinance.kz", "hash", "Admin Svc Test", Role.ADMIN);
                    return userRepository.save(newAdmin);
                });

        Course created = courseService.createCourse(
                "New Interactive 1C Course",
                "Detailed 1C accounting course",
                "https://example.com/thumb.jpg",
                true,
                admin
        );

        assertNotNull(created.getId(), "Created course must have generated ID");
        assertNotNull(created.getCreatedBy(), "Created course must have non-null createdBy");
        assertEquals(admin.getId(), created.getCreatedBy().getId(), "Created course creator must match passed admin");
    }
}
