package com.example.zhanfinancebackend.modules.courses.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationRunner.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void runMigration() {
        try {
            jdbcTemplate.execute("""
                INSERT INTO app_users (full_name, email, password_hash, role, auth_provider, enabled, locale, created_at, updated_at, version)
                SELECT 'Виктор Сергеевич (Куратор 1С)', 'curator1c@zhanfinance.kz',
                       '$2a$10$y1/xsqpoLRTwGMuopoLSROiC4VXrd88lZcvaTD.gz8nFuN7k6kYmy',
                       'CURATOR', 'LOCAL', true, 'ru', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
                WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE email = 'curator1c@zhanfinance.kz')
            """);

            jdbcTemplate.execute("""
                INSERT INTO courses (title, description, thumbnail, status, created_by, created_at, updated_at, version)
                SELECT
                    '1С:Бухгалтерия 8.3 — Полный практический курс',
                    'Практический обучающий курс по ведению комплексного учёта в 1С:Бухгалтерия 8.3.',
                    'https://images.unsplash.com/photo-1554200876-56c2f25224fa?q=80&w=800&auto=format&fit=crop',
                    'PUBLISHED',
                    (SELECT id FROM app_users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    0
                WHERE NOT EXISTS (
                    SELECT 1 FROM courses WHERE title = '1С:Бухгалтерия 8.3 — Полный практический курс'
                )
            """);

            jdbcTemplate.execute("""
                UPDATE stages SET is_pre_final = true WHERE name IN ('На проверке', 'Review', 'Согласование')
            """);

            log.info("DatabaseMigrationRunner completed successfully.");
        } catch (Exception e) {
            log.error("DatabaseMigrationRunner error: {}", e.getMessage());
        }
    }
}