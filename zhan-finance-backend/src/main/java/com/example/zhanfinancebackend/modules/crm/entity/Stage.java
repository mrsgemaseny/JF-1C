package com.example.zhanfinancebackend.modules.crm.entity;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import jakarta.persistence.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.example.zhanfinancebackend.modules.audit.annotation.AuditedEntity;

@Entity
@Table(name = "stages")
@EntityListeners(AuditingEntityListener.class)
@AuditedEntity
public class Stage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private Pipeline pipeline;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_en")
    private String nameEn;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(length = 64)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private StageType type = StageType.OPEN;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @Column(name = "is_pre_final", nullable = false, columnDefinition = "boolean default false")
    private boolean isPreFinal = false;

    @Column(name = "sla_hours")
    private Integer slaHours;

    public Stage() {}


    public Stage(Pipeline pipeline, String name, Integer orderIndex, String color, StageType type) {
        this.pipeline = pipeline;
        this.name = name;
        this.orderIndex = orderIndex;
        this.color = color;
        this.type = type;
    }

    public Pipeline getPipeline() {
        return pipeline;
    }

    public void setPipeline(Pipeline pipeline) {
        this.pipeline = pipeline;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public StageType getType() {
        return type;
    }

    public void setType(StageType type) {
        this.type = type;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean aDefault) {
        isDefault = aDefault;
    }

    public boolean isPreFinal() {
        return isPreFinal;
    }

    public void setPreFinal(boolean preFinal) {
        isPreFinal = preFinal;
    }

    public Integer getSlaHours() {
        return slaHours;
    }

    public void setSlaHours(Integer slaHours) {
        this.slaHours = slaHours;
    }
}
