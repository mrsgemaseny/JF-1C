package com.example.zhanfinancebackend.modules.courses.repository;

import com.example.zhanfinancebackend.modules.courses.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findAllByChapterIdOrderByOrderIndexAscCreatedAtAsc(Long chapterId);
    List<Lesson> findAllByChapterIdOrderByOrderIndexAscCreatedAtAscIdAsc(Long chapterId);
    List<Lesson> findAllByChapterIdOrderByOrderIndexAscIdAsc(Long chapterId);

    @org.springframework.data.jpa.repository.Query("select l from Lesson l join fetch l.chapter c join fetch c.course co where lower(l.title) like lower(concat('%', :query, '%')) or lower(l.description) like lower(concat('%', :query, '%'))")
    java.util.List<Lesson> searchLessons(@org.springframework.data.repository.query.Param("query") String query);

    java.util.Optional<Lesson> findByMediaUrlOrFileUrl(String mediaUrl, String fileUrl);
}
