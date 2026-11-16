package com.example.zhanfinancebackend.modules.courses.repository;

import com.example.zhanfinancebackend.modules.courses.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    List<Chapter> findAllByCourseIdOrderByOrderIndexAscCreatedAtAsc(Long courseId);
    List<Chapter> findAllByCourseIdOrderByOrderIndexAscCreatedAtAscIdAsc(Long courseId);
    List<Chapter> findAllByCourseIdOrderByOrderIndexAscIdAsc(Long courseId);
    List<Chapter> findAllByCourseIdOrderByOrderIndexAsc(Long courseId);
}
