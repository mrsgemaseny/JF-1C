package com.example.zhanfinancebackend.modules.courses.service;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.example.zhanfinancebackend.modules.courses.entity.Chapter;
import com.example.zhanfinancebackend.modules.courses.entity.CourseStatus;
import com.example.zhanfinancebackend.modules.courses.repository.ChapterRepository;
import com.example.zhanfinancebackend.modules.courses.repository.EnrollmentRepository;
import com.example.zhanfinancebackend.modules.courses.repository.CertificateRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonProgressRepository;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final ChapterRepository chapterRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificateRepository certificateRepository;
    private final LessonProgressRepository lessonProgressRepository;

    public CourseService(CourseRepository courseRepository, 
                         ChapterRepository chapterRepository,
                         EnrollmentRepository enrollmentRepository,
                         CertificateRepository certificateRepository,
                         LessonProgressRepository lessonProgressRepository) {
        this.courseRepository = courseRepository;
        this.chapterRepository = chapterRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.certificateRepository = certificateRepository;
        this.lessonProgressRepository = lessonProgressRepository;
    }

    @Transactional(readOnly = true)
    public List<Course> getAllCourses() {
        return initializeCourses(courseRepository.findAllByOrderByIdDesc());
    }

    @Transactional(readOnly = true)
    public List<Course> getPublishedCourses() {
        return initializeCourses(courseRepository.findAllByStatusOrderByIdDesc(CourseStatus.PUBLISHED));
    }

    @Transactional(readOnly = true)
    public Course getCourseById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Course not found"));
        initializeCourseChaptersAndLessons(course);
        return course;
    }

    @Transactional(readOnly = true)
    public Course getPublishedCourseById(Long id) {
        Course course = getCourseById(id);
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Course is not published");
        }
        return course;
    }

    private void initializeCourseChaptersAndLessons(Course course) {
        if (course != null && course.getChapters() != null) {
            course.getChapters().forEach(ch -> {
                if (ch.getLessons() != null) {
                    ch.getLessons().size();
                }
            });
        }
    }

    private List<Course> initializeCourses(List<Course> courses) {
        if (courses != null) {
            courses.forEach(this::initializeCourseChaptersAndLessons);
        }
        return courses;
    }

    @Transactional
    public Course createCourse(String title, String description, String thumbnail, boolean isPublished, User admin) {
        Course course = new Course();
        course.setTitle(title);
        course.setDescription(description);
        course.setThumbnail(thumbnail);
        course.setStatus(isPublished ? CourseStatus.PUBLISHED : CourseStatus.DRAFT);
        course.setCreatedBy(admin);
        return courseRepository.save(course);
    }

    @Transactional
    public Course updateCourse(Long id, String title, String description, String thumbnail, boolean isPublished) {
        Course course = getCourseById(id);
        if (title != null) course.setTitle(title);
        if (description != null) course.setDescription(description);
        if (thumbnail != null) course.setThumbnail(thumbnail);
        course.setStatus(isPublished ? CourseStatus.PUBLISHED : CourseStatus.DRAFT);
        return courseRepository.save(course);
    }

    @Transactional
    public void deleteCourse(Long id) {
        Course course = getCourseById(id);
        lessonProgressRepository.deleteByCourseId(id);
        enrollmentRepository.deleteByCourseId(id);
        certificateRepository.deleteByCourseId(id);
        courseRepository.delete(course);
    }

    @Transactional
    public void deleteChapter(Long id) {
        chapterRepository.deleteById(id);
    }

    @Transactional
    public Chapter createChapter(Long courseId, String title, int orderIndex) {
        Course course = getCourseById(courseId);
        Chapter chapter = new Chapter();
        chapter.setCourse(course);
        chapter.setTitle(title);
        chapter.setOrderIndex(orderIndex);
        Chapter saved = chapterRepository.save(chapter);
        course.getChapters().add(saved);
        return saved;
    }
}
