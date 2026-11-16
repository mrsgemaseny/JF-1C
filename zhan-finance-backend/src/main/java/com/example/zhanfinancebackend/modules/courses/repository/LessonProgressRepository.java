package com.example.zhanfinancebackend.modules.courses.repository;

import com.example.zhanfinancebackend.modules.courses.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    Optional<LessonProgress> findByLessonIdAndUserId(Long lessonId, Long userId);
    
    @org.springframework.data.jpa.repository.Query("select lp from LessonProgress lp join fetch lp.lesson l join fetch l.chapter c where c.course.id = :courseId and lp.user.id = :userId")
    List<LessonProgress> findAllByCourseIdAndUserId(@org.springframework.data.repository.query.Param("courseId") Long courseId, @org.springframework.data.repository.query.Param("userId") Long userId);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from LessonProgress lp where lp.lesson.id = :lessonId")
    void deleteByLessonId(@org.springframework.data.repository.query.Param("lessonId") Long lessonId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from LessonProgress lp where lp.lesson.chapter.course.id = :courseId")
    void deleteByCourseId(@org.springframework.data.repository.query.Param("courseId") Long courseId);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from LessonProgress lp where lp.lesson.chapter.id = :chapterId")
    void deleteByChapterId(@org.springframework.data.repository.query.Param("chapterId") Long chapterId);
}
