-- V120: Extract course_curators DDL from ApplicationReadyEvent runner into versioned Flyway migration

CREATE TABLE IF NOT EXISTS course_curators (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    curator_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    assigned_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_course_curator UNIQUE (course_id, curator_id)
);

CREATE INDEX IF NOT EXISTS idx_course_curators_course ON course_curators(course_id);
CREATE INDEX IF NOT EXISTS idx_course_curators_curator ON course_curators(curator_id);
