package com.example.zhanfinancebackend.modules.crm.entity;

import com.example.zhanfinancebackend.common.audit.BaseEntity;
import com.example.zhanfinancebackend.modules.auth.entity.User;
import jakarta.persistence.*;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.example.zhanfinancebackend.modules.services.entity.ServiceEntity;

import com.example.zhanfinancebackend.modules.audit.annotation.AuditedEntity;

@Entity
@Table(name = "tasks")
@EntityListeners(AuditingEntityListener.class)
@AuditedEntity
public class Task extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;

    @Column(precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private LeadSource source;

    @Column(name = "closed_at")
    private LocalDate closedAt;

    @Column(name = "lost_reason", columnDefinition = "TEXT")
    private String lostReason;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "deadline_notified_at")
    private java.time.LocalDateTime deadlineNotifiedAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean archived = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(name = "stage_position")
    private Integer stagePosition = 0;

    @Column(name = "reassignment_requested")
    private Boolean reassignmentRequested = false;

    @Column(name = "edited_at")
    private java.time.LocalDateTime editedAt;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private List<Subtask> subtasks = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "task_tags", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "tag")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private List<String> tags = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "task_services",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private List<ServiceEntity> services = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "task_user_labels",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id")
    )
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private List<UserLabel> userLabels = new ArrayList<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private List<TaskComment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private List<TaskActivity> history = new ArrayList<>();

    public Task() {
    }

    public Task(String title, User client, User createdBy) {
        this.title = title;
        this.client = client;
        this.createdBy = createdBy;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public User getClient() {
        return client;
    }

    public void setClient(User client) {
        this.client = client;
    }

    public User getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(User assignedTo) {
        this.assignedTo = assignedTo;
    }

    public Stage getStage() {
        return stage;
    }

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public LeadSource getSource() {
        return source;
    }

    public void setSource(LeadSource source) {
        this.source = source;
    }

    public LocalDate getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(LocalDate closedAt) {
        this.closedAt = closedAt;
    }

    public String getLostReason() {
        return lostReason;
    }

    public void setLostReason(String lostReason) {
        this.lostReason = lostReason;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public java.time.LocalDateTime getDeadlineNotifiedAt() {
        return deadlineNotifiedAt;
    }

    public void setDeadlineNotifiedAt(java.time.LocalDateTime deadlineNotifiedAt) {
        this.deadlineNotifiedAt = deadlineNotifiedAt;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public java.time.LocalDateTime getEditedAt() {
        return editedAt;
    }

    public void setEditedAt(java.time.LocalDateTime editedAt) {
        this.editedAt = editedAt;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public Integer getStagePosition() {
        return stagePosition;
    }

    public void setStagePosition(Integer stagePosition) {
        this.stagePosition = stagePosition;
    }

    public Boolean isReassignmentRequested() {
        return reassignmentRequested != null ? reassignmentRequested : false;
    }

    public void setReassignmentRequested(Boolean reassignmentRequested) {
        this.reassignmentRequested = reassignmentRequested;
    }

    public List<Subtask> getSubtasks() {
        return subtasks;
    }

    public void setSubtasks(List<Subtask> subtasks) {
        this.subtasks.clear();
        if (subtasks != null) {
            this.subtasks.addAll(subtasks);
            for (Subtask st : subtasks) {
                st.setTask(this);
            }
        }
    }

    public void addSubtask(Subtask subtask) {
        subtasks.add(subtask);
        subtask.setTask(this);
    }

    public void removeSubtask(Subtask subtask) {
        subtasks.remove(subtask);
        subtask.setTask(null);
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags.clear();
        if (tags != null) {
            this.tags.addAll(tags);
        }
    }

    public List<TaskComment> getComments() {
        return comments;
    }

    public void setComments(List<TaskComment> comments) {
        this.comments.clear();
        if (comments != null) {
            this.comments.addAll(comments);
        }
    }

    public void addComment(TaskComment comment) {
        comments.add(comment);
        comment.setTask(this);
    }

    public List<TaskActivity> getHistory() {
        return history;
    }

    public void setHistory(List<TaskActivity> history) {
        this.history.clear();
        if (history != null) {
            this.history.addAll(history);
        }
    }

    public void addActivity(TaskActivity activity) {
        history.add(activity);
        activity.setTask(this);
    }

    public List<ServiceEntity> getServices() {
        return services;
    }

    public void setServices(List<ServiceEntity> services) {
        this.services.clear();
        if (services != null) {
            this.services.addAll(services);
        }
    }

    public List<UserLabel> getUserLabels() {
        return userLabels;
    }

    public void setUserLabels(List<UserLabel> userLabels) {
        this.userLabels.clear();
        if (userLabels != null) {
            this.userLabels.addAll(userLabels);
        }
    }
}
