package com.example.zhanfinancebackend.modules.courses.dto;

import com.example.zhanfinancebackend.modules.courses.entity.LessonType;
import lombok.Data;

@Data
public class LessonDto {
    private Long id;
    private Long chapterId;
    private Long courseId;
    private String title;
    private String description;
    private LessonType type;
    private int orderIndex;
    private int durationMinutes;
    private boolean isPreview;
    private String content;
    private String mediaUrl;
}
