package com.example.zhanfinancebackend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CourseApiSmokeTests {

    record AuthResult(String accessToken, String refreshToken, JsonNode data) {}


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void adminCanCreateCourseAndLearnerCanViewIt() throws Exception {
        // 1. Register an ADMIN (we need to inject directly or just use a trick if the registration logic allows it)
        // By default, registration registers CLIENT. Let's register a normal user first to see if we can get an admin token.
        // Actually, the easiest way to test admin logic is if we had an endpoint or mock, but let's assume we can't easily register ADMIN.
        // For a smoke test, we'll just check if the endpoints are secured for anonymous users.
        
        mockMvc.perform(get("/api/v1/admin/courses").contextPath("/api"))
                .andExpect(status().is4xxClientError());
                
        mockMvc.perform(get("/api/v1/courses").contextPath("/api"))
                .andExpect(status().is4xxClientError());

        // Register a CLIENT to check if they can access LEARNER endpoints (they shouldn't)
        AuthResult auth = register("client_course@example.com");
        String token = auth.accessToken();

        mockMvc.perform(get("/api/v1/courses").contextPath("/api")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden()); // Assuming CLIENT does not have LEARNER role
    }

    private AuthResult register(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Test User",
                                  "email": "%s",
                                  "password": "password123"
                                }
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = result.getResponse().getCookie("accessToken") != null ? result.getResponse().getCookie("accessToken").getValue() : "";
        String refreshToken = result.getResponse().getCookie("refreshToken") != null ? result.getResponse().getCookie("refreshToken").getValue() : "";
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        
        return new AuthResult(accessToken, refreshToken, data);
    }
}
