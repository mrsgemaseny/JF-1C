-- V119__fix_courses_created_by_null.sql
-- Backfill created_by in courses and assigned_by in course_curators where NULL using first admin user id

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
);

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
);
