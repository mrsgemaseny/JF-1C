package com.example.zhanfinancebackend;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.entity.LessonType;
import com.example.zhanfinancebackend.modules.courses.repository.CourseRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CourseIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private com.example.zhanfinancebackend.modules.auth.repository.UserRepository userRepository;

    @Autowired
    private com.example.zhanfinancebackend.modules.auth.security.JwtService jwtService;

    @BeforeEach
    void setUp() {
        courseRepository.deleteAll();
        lessonRepository.deleteAll();
    }

    @Autowired
    private com.example.zhanfinancebackend.modules.auth.service.AuthService authService;

    private String registerAndGetToken(String email, Role role) throws Exception {
        authService.register(
                new com.example.zhanfinancebackend.modules.auth.dto.RegisterRequest(
                        "Test User",
                        email,
                        "password123",
                        role,
                        null,
                        null
                )
        );
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        user.setRole(role);
        user.setEnabled(true);
        user = userRepository.save(user);
        return jwtService.generateAccessToken(user);
    }

    @Test
    void adminCanCreateCourseAndLessonWithFile_LearnerCanViewAndDownload() throws Exception {
        String adminToken = registerAndGetToken("admin@test.com", Role.ADMIN);
        String learnerToken = registerAndGetToken("learner@test.com", Role.LEARNER);

        // 1. Admin creates a course
        MvcResult courseResult = mockMvc.perform(post("/api/v1/admin/courses").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .header("X-Requested-With", "XMLHttpRequest")
                        .param("title", "Integration Test Course")
                        .param("description", "Desc")
                        .param("isPublished", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Integration Test Course"))
                .andReturn();

        Long courseId = objectMapper.readTree(courseResult.getResponse().getContentAsString()).get("data").get("id").asLong();

        // 2. Admin adds a lesson with a file
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-video.mp4",
                "video/mp4",
                "dummy video content".getBytes()
        );

        MvcResult lessonResult = mockMvc.perform(multipart("/api/v1/admin/courses/" + courseId + "/lessons").contextPath("/api")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .header("X-Requested-With", "XMLHttpRequest")
                        .param("title", "First Lesson")
                        .param("type", "VIDEO")
                        .param("orderIndex", "0"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andReturn();

        Long lessonId = objectMapper.readTree(lessonResult.getResponse().getContentAsString()).get("data").get("id").asLong();

        // 3. Learner fetches published courses
        mockMvc.perform(get("/api/v1/courses").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(courseId));

        // 4. Learner fetches specific course
        mockMvc.perform(get("/api/v1/courses/" + courseId).contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.chapters[0].lessons[0].id").value(lessonId));

        // 5. Learner downloads/streams the video (Full request)
        // TODO: Phase 2 - Re-enable file streaming tests
        /*
        mockMvc.perform(get("/api/v1/courses/lessons/" + lessonId + "/file").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken))
                .andExpect(status().isOk())
                .andExpect(content().string("dummy video content"));

        // 6. Learner streaming with Range Header (Partial content)
        mockMvc.perform(get("/api/v1/courses/lessons/" + lessonId + "/file").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken)
                        .header(HttpHeaders.RANGE, "bytes=0-4"))
                .andExpect(status().isPartialContent())
                .andExpect(content().string("dummy"));
        */
    }

    @Test
    void learnerCannotAccessUnpublishedCourse() throws Exception {
        String adminToken = registerAndGetToken("admin2@test.com", Role.ADMIN);
        String learnerToken = registerAndGetToken("learner2@test.com", Role.LEARNER);

        // 1. Admin creates UNPUBLISHED course
        MvcResult courseResult = mockMvc.perform(post("/api/v1/admin/courses").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .header("X-Requested-With", "XMLHttpRequest")
                        .param("title", "Secret Course")
                        .param("isPublished", "false"))
                .andExpect(status().isOk())
                .andReturn();

        Long courseId = objectMapper.readTree(courseResult.getResponse().getContentAsString()).get("data").get("id").asLong();

        // 2. Admin adds a lesson
        MvcResult lessonResult = mockMvc.perform(post("/api/v1/admin/courses/" + courseId + "/lessons").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .header("X-Requested-With", "XMLHttpRequest")
                        .param("title", "Secret Lesson")
                        .param("type", "DOCUMENT"))
                .andExpect(status().isOk())
                .andReturn();
        Long lessonId = objectMapper.readTree(lessonResult.getResponse().getContentAsString()).get("data").get("id").asLong();

        // 3. Learner should NOT see it in the list
        mockMvc.perform(get("/api/v1/courses").contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());

        // 4. Learner should get error when accessing directly
        mockMvc.perform(get("/api/v1/courses/" + courseId).contextPath("/api")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken))
                .andExpect(status().isForbidden());

        // 5. Learner should get 403 when trying to access the lesson's file (if it had one)
        // TODO: Phase 2 - Re-enable file streaming tests
        /*
        mockMvc.perform(get("/v1/courses/lessons/" + lessonId + "/file")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + learnerToken))
                .andExpect(status().isForbidden());
        */
    }
}
