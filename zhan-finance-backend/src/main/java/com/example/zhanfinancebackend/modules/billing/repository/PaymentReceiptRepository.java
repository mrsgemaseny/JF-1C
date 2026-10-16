package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceipt;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentReceiptStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentReceiptRepository extends JpaRepository<PaymentReceipt, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM PaymentReceipt r JOIN FETCH r.client c LEFT JOIN FETCH r.subscription s LEFT JOIN FETCH r.invoice i LEFT JOIN FETCH r.reviewedBy rev WHERE r.id = :id")
    Optional<PaymentReceipt> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT r FROM PaymentReceipt r JOIN FETCH r.client c LEFT JOIN FETCH r.subscription s LEFT JOIN FETCH r.invoice i LEFT JOIN FETCH r.reviewedBy rev WHERE r.client.id = :clientId ORDER BY r.createdAt DESC")
    List<PaymentReceipt> findByClientIdOrderByCreatedAtDesc(@Param("clientId") Long clientId);

    @Query("SELECT r FROM PaymentReceipt r JOIN FETCH r.client c LEFT JOIN FETCH r.subscription s LEFT JOIN FETCH r.invoice i LEFT JOIN FETCH r.reviewedBy rev WHERE r.status = :status ORDER BY r.createdAt DESC")
    List<PaymentReceipt> findByStatusOrderByCreatedAtDesc(@Param("status") PaymentReceiptStatus status);

    @Query("SELECT r FROM PaymentReceipt r JOIN FETCH r.client c LEFT JOIN FETCH r.subscription s LEFT JOIN FETCH r.invoice i LEFT JOIN FETCH r.reviewedBy rev ORDER BY r.createdAt DESC")
    List<PaymentReceipt> findAllWithDetailsOrderByCreatedAtDesc();

    @Query("SELECT r FROM PaymentReceipt r JOIN FETCH r.client c LEFT JOIN FETCH r.subscription s LEFT JOIN FETCH r.invoice i LEFT JOIN FETCH r.reviewedBy rev WHERE r.id = :id AND r.client.id = :clientId")
    Optional<PaymentReceipt> findByIdAndClientId(@Param("id") Long id, @Param("clientId") Long clientId);

    @Query("SELECT COUNT(r) > 0 FROM PaymentReceipt r WHERE r.invoice.id = :invoiceId AND r.status = :status")
    boolean existsByInvoiceIdAndStatus(@Param("invoiceId") Long invoiceId, @Param("status") PaymentReceiptStatus status);

    @Query("SELECT COUNT(r) > 0 FROM PaymentReceipt r WHERE r.subscription.id = :subscriptionId AND r.status = :status")
    boolean existsBySubscriptionIdAndStatus(@Param("subscriptionId") Long subscriptionId, @Param("status") PaymentReceiptStatus status);

    @Query("SELECT COUNT(r) > 0 FROM PaymentReceipt r WHERE r.client.id = :clientId AND r.status = :status")
    boolean existsByClientIdAndStatus(@Param("clientId") Long clientId, @Param("status") PaymentReceiptStatus status);

    @Query("SELECT r FROM PaymentReceipt r JOIN FETCH r.client c LEFT JOIN FETCH r.subscription s LEFT JOIN FETCH r.invoice i LEFT JOIN FETCH r.reviewedBy rev WHERE r.receiptFileKey = :fileKey")
    Optional<PaymentReceipt> findByReceiptFileKey(@Param("fileKey") String fileKey);
}

