package com.example.zhanfinancebackend.modules.courses.controller;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.auth.security.UserPrincipal;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.entity.Lesson;
import com.example.zhanfinancebackend.modules.courses.entity.LessonType;
import com.example.zhanfinancebackend.modules.courses.service.CourseService;
import com.example.zhanfinancebackend.modules.courses.service.LessonService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.zhanfinancebackend.common.response.ApiResponse;
import java.util.List;

import com.example.zhanfinancebackend.modules.courses.entity.Chapter;

@RestController
@RequestMapping("/v1/admin/courses")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCourseController {

    private final CourseService courseService;
    private final LessonService lessonService;

    public AdminCourseController(CourseService courseService, LessonService lessonService) {
        this.courseService = courseService;
        this.lessonService = lessonService;
    }

    @GetMapping
    public ApiResponse<List<Course>> getAllCourses() {
        return ApiResponse.success(courseService.getAllCourses());
    }

    @GetMapping("/{id}")
    public ApiResponse<Course> getCourseById(@PathVariable Long id) {
        return ApiResponse.success(courseService.getCourseById(id));
    }

    @PostMapping
    public ApiResponse<Course> createCourse(
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "isPublished", defaultValue = "false") boolean isPublished,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User admin = userPrincipal.getUser();
        return ApiResponse.success(courseService.createCourse(title, description, null, isPublished, admin));
    }

    @PutMapping("/{id}")
    public ApiResponse<Course> updateCourse(
            @PathVariable Long id,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "isPublished", required = false) Boolean isPublished) {
        return ApiResponse.success(courseService.updateCourse(id, title, description, null, isPublished != null ? isPublished : false));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCourse(@PathVariable Long id) {
        courseService.deleteCourse(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/{courseId}/lessons")
    public ApiResponse<Lesson> createLesson(
            @PathVariable Long courseId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("type") LessonType type,
            @RequestParam(value = "orderIndex", defaultValue = "0") int orderIndex,
            @RequestParam(value = "durationMinutes", required = false) Integer durationMinutes,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        return ApiResponse.success(lessonService.createLesson(courseId, title, description, type, orderIndex, durationMinutes, file));
    }

    @PutMapping("/lessons/{lessonId}")
    public ApiResponse<Lesson> updateLesson(
            @PathVariable Long lessonId,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "orderIndex", required = false) Integer orderIndex,
            @RequestParam(value = "durationMinutes", required = false) Integer durationMinutes,
            @RequestParam(value = "isPreview", required = false) Boolean isPreview,
            @RequestParam(value = "mediaUrl", required = false) String mediaUrl,
            @RequestParam(value = "videoFile", required = false) MultipartFile videoFile,
            @RequestParam(value = "documentFile", required = false) MultipartFile documentFile) {
        return ApiResponse.success(lessonService.updateLesson(lessonId, title, description, content, orderIndex, 
            durationMinutes, isPreview, mediaUrl, videoFile, documentFile));
    }

    @DeleteMapping("/lessons/{lessonId}")
    public ApiResponse<Void> deleteLesson(@PathVariable Long lessonId) {
        lessonService.deleteLesson(lessonId);
        return ApiResponse.success(null);
    }


    @PostMapping("/{courseId}/chapters")
    public ApiResponse<Chapter> createChapter(
            @PathVariable Long courseId,
            @RequestParam("title") String title,
            @RequestParam(value = "orderIndex", defaultValue = "0") int orderIndex) {
        return ApiResponse.success(courseService.createChapter(courseId, title, orderIndex));
    }

    @DeleteMapping("/chapters/{chapterId}")
    public ApiResponse<Void> deleteChapter(@PathVariable Long chapterId) {
        courseService.deleteChapter(chapterId);
        return ApiResponse.success(null);
    }

    @PostMapping("/chapters/{chapterId}/lessons")
    public ApiResponse<Lesson> createLessonForChapter(
            @PathVariable Long chapterId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("type") LessonType type,
            @RequestParam(value = "orderIndex", defaultValue = "0") int orderIndex,
            @RequestParam(value = "durationMinutes", required = false) Integer durationMinutes) {
        return ApiResponse.success(lessonService.createLessonForChapter(chapterId, title, description, type, orderIndex, durationMinutes));
    }
}
