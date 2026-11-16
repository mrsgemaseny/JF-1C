package com.example.zhanfinancebackend.modules.crm.service;

import com.example.zhanfinancebackend.modules.auth.entity.Role;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.repository.UserRepository;
import com.example.zhanfinancebackend.modules.auth.security.JwtService;
import com.example.zhanfinancebackend.modules.crm.entity.Pipeline;
import com.example.zhanfinancebackend.modules.crm.entity.Stage;
import com.example.zhanfinancebackend.modules.crm.entity.StageType;
import com.example.zhanfinancebackend.modules.crm.repository.PipelineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PipelineIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PipelineRepository pipelineRepository;

    private String adminToken;

    @BeforeEach
    void setup() {
        User admin = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .findFirst()
                .orElseGet(() -> userRepository.save(new User("Admin Test", "admin_pipeline_test@test.com", "pass", Role.ADMIN)));
        adminToken = jwtService.generateAccessToken(admin);

        if (pipelineRepository.findAll().stream().noneMatch(p -> "Test Pipeline".equals(p.getName()))) {
            Pipeline pipeline = new Pipeline("Test Pipeline");
            pipeline.setDefault(false);

            Stage s1 = new Stage(pipeline, "New Test Stage", 0, "#000000", StageType.OPEN);
            Stage s2 = new Stage(pipeline, "Done Test Stage", 1, "#ffffff", StageType.WON);

            pipeline.addStage(s1);
            pipeline.addStage(s2);

            pipelineRepository.save(pipeline);
        }
    }

    @Test
    void getPipelines_ShouldReturnPipelinesWithStages() throws Exception {
        mockMvc.perform(get("/api/v1/crm/pipelines").contextPath("/api")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[*].name", hasItem("Test Pipeline")));
    }
}
