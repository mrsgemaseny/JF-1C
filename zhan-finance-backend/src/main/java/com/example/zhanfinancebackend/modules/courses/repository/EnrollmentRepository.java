package com.example.zhanfinancebackend.modules.courses.repository;

import com.example.zhanfinancebackend.modules.courses.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    Optional<Enrollment> findByCourseIdAndUserId(Long courseId, Long userId);
    List<Enrollment> findAllByUserId(Long userId);
    List<Enrollment> findAllByCourseId(Long courseId);
    List<Enrollment> findAllByCourseIdIn(List<Long> courseIds);
    boolean existsByCourseIdAndUserId(Long courseId, Long userId);
    void deleteByCourseId(Long courseId);
}
