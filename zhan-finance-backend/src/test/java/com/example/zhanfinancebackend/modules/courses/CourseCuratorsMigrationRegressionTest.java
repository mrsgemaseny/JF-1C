package com.example.zhanfinancebackend.modules.courses;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class CourseCuratorsMigrationRegressionTest {

    @Test
    @DisplayName("W9 Regression: Flyway migration V120 defines course_curators table with constraints")
    void v120Migration_existsAndContainsDdl() throws Exception {
        Path migrationPath = Path.of("src/main/resources/db/migration/V120__create_course_curators_table.sql");
        assertTrue(Files.exists(migrationPath), "Migration V120 must exist in db/migration/");

        String sql = Files.readString(migrationPath);
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS course_curators"), "V120 must create course_curators table");
        assertTrue(sql.contains("CONSTRAINT uk_course_curator UNIQUE (course_id, curator_id)"), "V120 must define unique constraint");
        assertTrue(sql.contains("REFERENCES courses(id) ON DELETE CASCADE"), "V120 must reference courses");
        assertTrue(sql.contains("REFERENCES app_users(id) ON DELETE CASCADE"), "V120 must reference app_users");
    }

    @Test
    @DisplayName("W9 Regression: DatabaseMigrationRunner does not contain raw DDL CREATE TABLE")
    void databaseMigrationRunner_containsNoRawDdl() throws Exception {
        Path runnerPath = Path.of("src/main/java/com/example/zhanfinancebackend/modules/courses/config/DatabaseMigrationRunner.java");
        assertTrue(Files.exists(runnerPath), "DatabaseMigrationRunner must exist");

        String code = Files.readString(runnerPath);
        assertFalse(code.contains("CREATE TABLE"), "DatabaseMigrationRunner must not contain CREATE TABLE DDL statements");
    }
}
