package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.billing.entity.OnlinePayment;
import com.example.zhanfinancebackend.modules.billing.entity.PaymentProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OnlinePaymentRepository extends JpaRepository<OnlinePayment, Long> {
    Optional<OnlinePayment> findByProviderAndProviderPaymentId(PaymentProvider provider, String providerPaymentId);
    Optional<OnlinePayment> findByInvoiceId(Long invoiceId);
    boolean existsByInvoiceId(Long invoiceId);
}
