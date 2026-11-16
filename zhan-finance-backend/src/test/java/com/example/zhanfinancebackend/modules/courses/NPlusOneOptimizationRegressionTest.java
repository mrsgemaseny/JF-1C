package com.example.zhanfinancebackend.modules.courses;

import com.example.zhanfinancebackend.modules.courses.entity.Chapter;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.documents.repository.DocumentRepository;
import org.hibernate.annotations.BatchSize;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.EntityGraph;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class NPlusOneOptimizationRegressionTest {

    @Test
    @DisplayName("C2 Regression: Course entity collections (curators, chapters) have @BatchSize configured")
    void courseCollections_haveBatchSizeAnnotation() throws Exception {
        Field curatorsField = Course.class.getDeclaredField("curators");
        Field chaptersField = Course.class.getDeclaredField("chapters");

        assertTrue(curatorsField.isAnnotationPresent(BatchSize.class), "Course.curators must have @BatchSize");
        assertTrue(chaptersField.isAnnotationPresent(BatchSize.class), "Course.chapters must have @BatchSize");
        assertTrue(curatorsField.getAnnotation(BatchSize.class).size() >= 20);
        assertTrue(chaptersField.getAnnotation(BatchSize.class).size() >= 20);
    }

    @Test
    @DisplayName("C2 Regression: Chapter entity lessons collection has @BatchSize configured")
    void chapterLessons_haveBatchSizeAnnotation() throws Exception {
        Field lessonsField = Chapter.class.getDeclaredField("lessons");

        assertTrue(lessonsField.isAnnotationPresent(BatchSize.class), "Chapter.lessons must have @BatchSize");
        assertTrue(lessonsField.getAnnotation(BatchSize.class).size() >= 20);
    }

    @Test
    @DisplayName("C2 Regression: DocumentRepository listing methods have @EntityGraph configured")
    void documentRepositoryMethods_haveEntityGraphAnnotation() throws Exception {
        Method findAllByOrderByCreatedAtDesc = DocumentRepository.class.getMethod("findAllByOrderByCreatedAtDesc");
        Method findByUserIdOrderByCreatedAtDesc = DocumentRepository.class.getMethod("findByUserIdOrderByCreatedAtDesc", Long.class);

        assertTrue(findAllByOrderByCreatedAtDesc.isAnnotationPresent(EntityGraph.class),
                "DocumentRepository.findAllByOrderByCreatedAtDesc must have @EntityGraph");
        assertTrue(findByUserIdOrderByCreatedAtDesc.isAnnotationPresent(EntityGraph.class),
                "DocumentRepository.findByUserIdOrderByCreatedAtDesc must have @EntityGraph");
    }
}
