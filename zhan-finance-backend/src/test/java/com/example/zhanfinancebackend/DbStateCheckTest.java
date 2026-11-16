package com.example.zhanfinancebackend;

import com.example.zhanfinancebackend.modules.crm.repository.PipelineRepository;
import com.example.zhanfinancebackend.modules.crm.repository.StageRepository;
import com.example.zhanfinancebackend.modules.crm.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
public class DbStateCheckTest {

    @Autowired
    private PipelineRepository pipelineRepository;

    @Autowired
    private StageRepository stageRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Test
    public void printDbState() {
        System.out.println("=== DB STATE BEGIN ===");
        System.out.println("Pipelines count: " + pipelineRepository.count());
        System.out.println("Stages count: " + stageRepository.count());
        System.out.println("Tasks count: " + taskRepository.count());
        
        System.out.println("Pipelines:");
        pipelineRepository.findAll().forEach(p -> System.out.println("Pipeline: " + p.getId() + " - " + p.getName()));
        
        System.out.println("Tasks (first 10):");
        taskRepository.findAll().stream().limit(10).forEach(t -> {
            System.out.println("Task: " + t.getId() + " - " + t.getTitle() + " - Stage ID: " + (t.getStage() != null ? t.getStage().getId() : "NULL"));
        });
        System.out.println("=== DB STATE END ===");
    }
}
