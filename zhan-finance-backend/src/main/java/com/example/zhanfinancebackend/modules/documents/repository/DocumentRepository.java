package com.example.zhanfinancebackend.modules.documents.repository;

import com.example.zhanfinancebackend.modules.documents.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    Page<Document> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    List<Document> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    @Query(
        value = "SELECT DISTINCT d FROM Document d LEFT JOIN d.task t LEFT JOIN t.client c WHERE d.user.id = :userId OR d.uploadedBy.id = :userId OR c.id = :userId ORDER BY d.createdAt DESC",
        countQuery = "SELECT COUNT(DISTINCT d) FROM Document d LEFT JOIN d.task t LEFT JOIN t.client c WHERE d.user.id = :userId OR d.uploadedBy.id = :userId OR c.id = :userId"
    )
    Page<Document> findByUserIdOrTaskClientId(@Param("userId") Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN d.task t LEFT JOIN t.client c WHERE d.user.id = :userId OR d.uploadedBy.id = :userId OR c.id = :userId ORDER BY d.createdAt DESC")
    List<Document> findByUserIdOrTaskClientId(@Param("userId") Long userId);
    
    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    Page<Document> findByUser_AssignedEmployee_IdOrderByCreatedAtDesc(Long employeeId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    List<Document> findByUser_AssignedEmployee_IdOrderByCreatedAtDesc(Long employeeId);
    
    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    @Query(
        value = "SELECT DISTINCT d FROM Document d LEFT JOIN d.user u LEFT JOIN d.task t WHERE u.assignedEmployee.id = :employeeId OR d.uploadedBy.id = :employeeId OR t.assignedTo.id = :employeeId ORDER BY d.createdAt DESC",
        countQuery = "SELECT COUNT(DISTINCT d) FROM Document d LEFT JOIN d.user u LEFT JOIN d.task t WHERE u.assignedEmployee.id = :employeeId OR d.uploadedBy.id = :employeeId OR t.assignedTo.id = :employeeId"
    )
    Page<Document> findForEmployee(@Param("employeeId") Long employeeId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN d.user u LEFT JOIN d.task t WHERE u.assignedEmployee.id = :employeeId OR d.uploadedBy.id = :employeeId OR t.assignedTo.id = :employeeId ORDER BY d.createdAt DESC")
    List<Document> findForEmployee(@Param("employeeId") Long employeeId);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    Page<Document> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    List<Document> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    Page<Document> findByTaskIdOrderByCreatedAtDesc(Long taskId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    List<Document> findByTaskIdOrderByCreatedAtDesc(Long taskId);

    @EntityGraph(attributePaths = {"user", "uploadedBy", "task", "generatedFromTemplate"})
    @Query("SELECT d FROM Document d WHERE d.id IN :ids")
    List<Document> findDocumentsByIds(@Param("ids") List<Long> ids);

    Optional<Document> findByStorageKey(String storageKey);
    
    @Modifying
    @Query("UPDATE Document d SET d.generatedFromTemplate = null WHERE d.generatedFromTemplate.id = :templateId")
    void nullifyTemplateReference(@Param("templateId") UUID templateId);
}
