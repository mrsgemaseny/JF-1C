package com.example.zhanfinancebackend.modules.services;

import com.example.zhanfinancebackend.modules.services.entity.ServiceEntity;
import com.example.zhanfinancebackend.modules.services.repository.ServiceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.zhanfinancebackend.ZhanFinanceBackendApplication;

@SpringBootTest(classes = ZhanFinanceBackendApplication.class)
@ActiveProfiles("test")
public class ServiceDatabaseSeederTest {

    @Autowired
    private ServiceRepository serviceRepository;

    @Test
    public void testDatabaseIsSeededOnStartup() {
        // ApplicationReadyEvent should have fired by the time this test runs
        List<ServiceEntity> services = serviceRepository.findAll();
        
        // Assert that the seeder inserted exactly 6 items
        assertThat(services).hasSize(6);
        
        // Assert some specific content
        boolean hasAccounting = services.stream()
                .anyMatch(s -> s.getTitle().equals("Бухгалтерское сопровождение"));
        
        assertThat(hasAccounting).isTrue();
    }
}
