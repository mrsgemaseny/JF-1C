package com.example.zhanfinancebackend.modules.courses.entity;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.common.audit.BaseEntity;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

import com.example.zhanfinancebackend.modules.audit.annotation.AuditedEntity;

@Entity
@Table(name = "courses")
@AuditedEntity
@Getter
@Setter
public class Course extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail")
    private String thumbnail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, columnDefinition = "VARCHAR(32) DEFAULT 'DRAFT'")
    private CourseStatus status = CourseStatus.DRAFT;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @JsonIgnore
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<CourseCurator> curators = new ArrayList<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC, createdAt ASC, id ASC")
    @org.hibernate.annotations.BatchSize(size = 50)
    private List<Chapter> chapters = new ArrayList<>();
}
