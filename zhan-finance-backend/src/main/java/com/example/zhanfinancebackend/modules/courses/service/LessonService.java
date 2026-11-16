package com.example.zhanfinancebackend.modules.courses.service;

import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.entity.Lesson;
import com.example.zhanfinancebackend.modules.courses.entity.LessonType;
import com.example.zhanfinancebackend.modules.courses.repository.CourseRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonRepository;
import com.example.zhanfinancebackend.modules.documents.service.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.zhanfinancebackend.modules.courses.entity.Chapter;
import com.example.zhanfinancebackend.modules.courses.repository.ChapterRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonProgressRepository;

@Service
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;
    private final CourseRepository courseRepository;
    private final StorageService storageService;
    private final LessonProgressRepository lessonProgressRepository;

    public LessonService(LessonRepository lessonRepository, ChapterRepository chapterRepository, CourseRepository courseRepository, StorageService storageService, LessonProgressRepository lessonProgressRepository) {
        this.lessonRepository = lessonRepository;
        this.chapterRepository = chapterRepository;
        this.courseRepository = courseRepository;
        this.storageService = storageService;
        this.lessonProgressRepository = lessonProgressRepository;
    }

    @Transactional(readOnly = true)
    public Lesson getLessonById(Long id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Lesson not found"));
        return lesson;
    }

    @Transactional
    public Lesson createLesson(Long courseId, String title, String description, LessonType type, int orderIndex, Integer durationMinutes, MultipartFile file) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Course not found"));

        Chapter chapter;
        if (course.getChapters().isEmpty()) {
            chapter = new Chapter();
            chapter.setCourse(course);
            chapter.setTitle("Default Chapter");
            chapter.setOrderIndex(0);
            chapter = chapterRepository.save(chapter);
            course.getChapters().add(chapter);
        } else {
            chapter = course.getChapters().get(0);
        }

        return createLessonForChapter(chapter.getId(), title, description, type, orderIndex, durationMinutes);
    }

    @Transactional
    public Lesson createLessonForChapter(Long chapterId, String title, String description, LessonType type, int orderIndex, Integer durationMinutes) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Chapter not found"));

        Lesson lesson = new Lesson();
        lesson.setChapter(chapter);
        lesson.setTitle(title);
        lesson.setDescription(description);
        lesson.setType(type);
        
        if (orderIndex <= 0) {
            int maxOrderIndex = chapter.getLessons().stream()
                    .mapToInt(Lesson::getOrderIndex)
                    .max()
                    .orElse(-1);
            lesson.setOrderIndex(maxOrderIndex + 1);
        } else {
            lesson.setOrderIndex(orderIndex);
        }

        lesson.setDurationMinutes(durationMinutes != null ? durationMinutes : 0);

        Lesson savedLesson = lessonRepository.save(lesson);
        if (!chapter.getLessons().contains(savedLesson)) {
            chapter.getLessons().add(savedLesson);
        }
        return savedLesson;
    }

    @Transactional
    public Lesson updateLesson(Long id, String title, String description, String content, Integer orderIndex, 
Integer durationMinutes, Boolean isPreview, String mediaUrl, MultipartFile videoFile, MultipartFile documentFile) {
        Lesson lesson = getLessonById(id);
        if (title != null) lesson.setTitle(title);
        if (description != null) lesson.setDescription(description);
        if (content != null) lesson.setContent(content);
        if (orderIndex != null) lesson.setOrderIndex(orderIndex);
        if (durationMinutes != null) lesson.setDurationMinutes(durationMinutes);
        if (isPreview != null) lesson.setIsPreview(isPreview);
        
        if (mediaUrl != null) {
            lesson.setMediaUrl(mediaUrl.isEmpty() ? null : mediaUrl);
        }

        if (videoFile != null && !videoFile.isEmpty()) {
            String filePath = storageService.store(videoFile);
            lesson.setMediaUrl("/uploads/" + filePath);
        }

        if (documentFile != null && !documentFile.isEmpty()) {
            String filePath = storageService.store(documentFile);
            lesson.setFileUrl("/uploads/" + filePath);
        }

        return lessonRepository.save(lesson);
    }

    @Transactional
    public void deleteLesson(Long id) {
        lessonRepository.deleteById(id);
    }
}
