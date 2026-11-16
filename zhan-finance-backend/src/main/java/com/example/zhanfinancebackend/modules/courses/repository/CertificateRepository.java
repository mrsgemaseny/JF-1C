package com.example.zhanfinancebackend.modules.courses.repository;

import com.example.zhanfinancebackend.modules.courses.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    Optional<Certificate> findByCourseIdAndUserId(Long courseId, Long userId);
    Optional<Certificate> findByCertificateCode(String certificateCode);
    void deleteByCourseId(Long courseId);
}
