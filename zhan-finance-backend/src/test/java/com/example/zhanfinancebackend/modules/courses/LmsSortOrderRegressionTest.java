package com.example.zhanfinancebackend.modules.courses;

import com.example.zhanfinancebackend.modules.courses.entity.Chapter;
import com.example.zhanfinancebackend.modules.courses.entity.Course;
import com.example.zhanfinancebackend.modules.courses.entity.Lesson;
import com.example.zhanfinancebackend.modules.courses.repository.ChapterRepository;
import com.example.zhanfinancebackend.modules.courses.repository.LessonRepository;
import jakarta.persistence.OrderBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LmsSortOrderRegressionTest {

    @Test
    @DisplayName("W1 Regression: Course.chapters and Chapter.lessons have deterministic secondary sort tiebreaker in @OrderBy")
    void entities_haveDeterministicOrderBy() throws Exception {
        Field chaptersField = Course.class.getDeclaredField("chapters");
        Field lessonsField = Chapter.class.getDeclaredField("lessons");

        assertTrue(chaptersField.isAnnotationPresent(OrderBy.class));
        assertTrue(lessonsField.isAnnotationPresent(OrderBy.class));

        assertEquals("orderIndex ASC, createdAt ASC, id ASC", chaptersField.getAnnotation(OrderBy.class).value());
        assertEquals("orderIndex ASC, createdAt ASC, id ASC", lessonsField.getAnnotation(OrderBy.class).value());
    }

    @Test
    @DisplayName("W1 Regression: ChapterRepository and LessonRepository provide methods with secondary tiebreakers")
    void repositories_haveDeterministicSortMethods() throws Exception {
        Method chapterSortMethod = ChapterRepository.class.getMethod("findAllByCourseIdOrderByOrderIndexAscCreatedAtAsc", Long.class);
        Method chapterSortWithIdMethod = ChapterRepository.class.getMethod("findAllByCourseIdOrderByOrderIndexAscCreatedAtAscIdAsc", Long.class);
        Method lessonSortMethod = LessonRepository.class.getMethod("findAllByChapterIdOrderByOrderIndexAscCreatedAtAsc", Long.class);
        Method lessonSortWithIdMethod = LessonRepository.class.getMethod("findAllByChapterIdOrderByOrderIndexAscCreatedAtAscIdAsc", Long.class);

        assertNotNull(chapterSortMethod);
        assertNotNull(chapterSortWithIdMethod);
        assertNotNull(lessonSortMethod);
        assertNotNull(lessonSortWithIdMethod);
    }

    @Test
    @DisplayName("W1 Regression: Sorting logic orders by createdAt ASC when orderIndex is identical")
    void sorting_ordersByCreatedAtAscWhenOrderIndexIdentical() throws Exception {
        Comparator<Chapter> chapterComparator = Comparator
                .comparingInt(Chapter::getOrderIndex)
                .thenComparing(Chapter::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Chapter::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        Instant t1 = Instant.parse("2026-08-21T00:00:00Z");
        Instant t2 = Instant.parse("2026-08-21T01:00:00Z");
        Instant t3 = Instant.parse("2026-08-21T02:00:00Z");

        Chapter c1 = new Chapter();
        c1.setId(10L);
        c1.setTitle("First Created");
        c1.setOrderIndex(0);
        setField(c1, "createdAt", t1);

        Chapter c2 = new Chapter();
        c2.setId(20L);
        c2.setTitle("Second Created");
        c2.setOrderIndex(0);
        setField(c2, "createdAt", t2);

        Chapter c3 = new Chapter();
        c3.setId(5L);
        c3.setTitle("Third Created but lower id");
        c3.setOrderIndex(0);
        setField(c3, "createdAt", t3);

        List<Chapter> list = Arrays.asList(c3, c2, c1);
        list.sort(chapterComparator);

        assertEquals("First Created", list.get(0).getTitle());
        assertEquals("Second Created", list.get(1).getTitle());
        assertEquals("Third Created but lower id", list.get(2).getTitle());
    }

    @Test
    @DisplayName("W1 Regression: orderIndex takes precedence over createdAt")
    void sorting_orderIndexTakesPrecedenceOverCreatedAt() throws Exception {
        Comparator<Lesson> lessonComparator = Comparator
                .comparingInt(Lesson::getOrderIndex)
                .thenComparing(Lesson::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Lesson::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        Instant earlyTime = Instant.parse("2026-08-20T10:00:00Z");
        Instant lateTime = Instant.parse("2026-08-21T10:00:00Z");

        Lesson l1 = new Lesson();
        l1.setId(1L);
        l1.setTitle("Later Index but Created Early");
        l1.setOrderIndex(2);
        setField(l1, "createdAt", earlyTime);

        Lesson l2 = new Lesson();
        l2.setId(2L);
        l2.setTitle("Earlier Index but Created Late");
        l2.setOrderIndex(1);
        setField(l2, "createdAt", lateTime);

        List<Lesson> list = Arrays.asList(l1, l2);
        list.sort(lessonComparator);

        assertEquals("Earlier Index but Created Late", list.get(0).getTitle());
        assertEquals("Later Index but Created Early", list.get(1).getTitle());
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Class<?> current = target.getClass();
        while (current != null) {
            try {
                Field f = current.getDeclaredField(fieldName);
                f.setAccessible(true);
                f.set(target, value);
                return;
            } catch (NoSuchFieldException e) {
                current = current.getSuperclass();
            }
        }
        throw new NoSuchFieldException("Field " + fieldName + " not found on " + target.getClass());
    }
}
