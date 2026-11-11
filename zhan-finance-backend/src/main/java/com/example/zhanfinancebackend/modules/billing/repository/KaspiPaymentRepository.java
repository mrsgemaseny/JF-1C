package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.billing.entity.KaspiPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KaspiPaymentRepository extends JpaRepository<KaspiPayment, Long> {
    Optional<KaspiPayment> findByProviderPaymentId(String providerPaymentId);
    boolean existsByInvoiceId(Long invoiceId);
}
