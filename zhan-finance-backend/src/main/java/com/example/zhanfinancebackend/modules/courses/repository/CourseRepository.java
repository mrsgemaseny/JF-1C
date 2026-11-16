package com.example.zhanfinancebackend.modules.courses.repository;

import com.example.zhanfinancebackend.modules.courses.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import com.example.zhanfinancebackend.modules.courses.entity.CourseStatus;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"chapters"})
    List<Course> findAllByOrderByIdDesc();

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"chapters"})
    List<Course> findAllByStatusOrderByIdDesc(CourseStatus status);

    @org.springframework.data.jpa.repository.Query("select c from Course c where c.status = 'PUBLISHED' and (lower(c.title) like lower(concat('%', :query, '%')) or lower(c.description) like lower(concat('%', :query, '%')))")
    List<Course> searchPublishedCourses(@org.springframework.data.repository.query.Param("query") String query);

    @org.springframework.data.jpa.repository.Query("select c from Course c where lower(c.title) like lower(concat('%', :query, '%')) or lower(c.description) like lower(concat('%', :query, '%'))")
    List<Course> searchCourses(@org.springframework.data.repository.query.Param("query") String query);
}
