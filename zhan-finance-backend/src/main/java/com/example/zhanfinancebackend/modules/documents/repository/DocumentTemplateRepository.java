package com.example.zhanfinancebackend.modules.documents.repository;

import com.example.zhanfinancebackend.modules.documents.entity.DocumentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, UUID> {

    @Query(value = "SELECT nextval('doc_number_seq')", nativeQuery = true)
    Long getNextDocNumber();

    boolean existsByNameIgnoreCase(String name);
}
