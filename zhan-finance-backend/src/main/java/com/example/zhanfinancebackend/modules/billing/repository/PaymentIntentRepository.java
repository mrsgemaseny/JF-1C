package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.billing.entity.PaymentIntent;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, Long> {

    // open-in-view is off and the service layer holds no transaction across network calls,
    // so the associations the service reads must be loaded eagerly.
    @EntityGraph(attributePaths = {"invoice", "client"})
    Optional<PaymentIntent> findByMerchantOrderId(String merchantOrderId);

    @EntityGraph(attributePaths = {"invoice", "client"})
    @Query("select i from PaymentIntent i where i.invoice.id = :invoiceId and i.client.id = :clientId " +
           "and i.status = :status and i.expiresAt > :now order by i.id desc")
    List<PaymentIntent> findActiveForInvoice(@Param("invoiceId") Long invoiceId,
                                             @Param("clientId") Long clientId,
                                             @Param("status") PaymentIntent.Status status,
                                             @Param("now") Instant now);
}
