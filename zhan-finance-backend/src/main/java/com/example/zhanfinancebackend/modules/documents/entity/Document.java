package com.example.zhanfinancebackend.modules.documents.entity;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.crm.entity.Task;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

import com.example.zhanfinancebackend.modules.audit.annotation.AuditedEntity;

@Entity
@Table(name = "documents")
@AuditedEntity
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "storage_key", nullable = false, unique = true, length = 512)
    private String storageKey;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "status", length = 50)
    private String status = "UPLOADED";

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmed_ip", length = 45)
    private String confirmedIp;

    @Column(name = "folder", length = 128)
    private String folder = "Разное";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_from_template_id")
    private DocumentTemplate generatedFromTemplate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @jakarta.persistence.Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;


    protected Document() {
    }

    public Document(User user, User uploadedBy, String fileName, String storageKey, String contentType, Long fileSize) {
        this.user = user;
        this.uploadedBy = uploadedBy;
        this.fileName = fileName;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.fileSize = fileSize;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public User getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(User uploadedBy) { this.uploadedBy = uploadedBy; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }
    public String getConfirmedIp() { return confirmedIp; }
    public void setConfirmedIp(String confirmedIp) { this.confirmedIp = confirmedIp; }
    public String getFolder() { return folder; }
    public void setFolder(String folder) { this.folder = folder; }
    public DocumentTemplate getGeneratedFromTemplate() { return generatedFromTemplate; }
    public void setGeneratedFromTemplate(DocumentTemplate generatedFromTemplate) { this.generatedFromTemplate = generatedFromTemplate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
