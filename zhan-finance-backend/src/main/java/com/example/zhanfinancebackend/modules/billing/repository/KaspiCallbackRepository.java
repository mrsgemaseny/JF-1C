package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.billing.entity.KaspiCallback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KaspiCallbackRepository extends JpaRepository<KaspiCallback, Long> {
    Optional<KaspiCallback> findByTxnIdAndCommand(String txnId, String command);
}
