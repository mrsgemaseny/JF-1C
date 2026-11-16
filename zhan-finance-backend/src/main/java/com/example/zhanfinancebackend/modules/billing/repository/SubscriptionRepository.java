package com.example.zhanfinancebackend.modules.billing.repository;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import com.example.zhanfinancebackend.modules.billing.entity.Subscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Page<Subscription> findAllByUser(User user, Pageable pageable);

    List<Subscription> findAllByUser(User user);

    Optional<Subscription> findByIdAndUser(Long id, User user);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(s) > 0 FROM Subscription s WHERE s.user = :user AND s.status != 'CANCELED' " +
           "AND (:excludeId IS NULL OR s.id != :excludeId) " +
           "AND s.startsAt IS NOT NULL " +
           "AND (s.endsAt IS NULL OR :startsAt <= s.endsAt) " +
           "AND (CAST(:endsAt AS date) IS NULL OR CAST(:endsAt AS date) >= s.startsAt)")
    boolean existsOverlappingSubscription(
            @org.springframework.data.repository.query.Param("user") User user, 
            @org.springframework.data.repository.query.Param("excludeId") Long excludeId, 
            @org.springframework.data.repository.query.Param("startsAt") java.time.LocalDate startsAt, 
            @org.springframework.data.repository.query.Param("endsAt") java.time.LocalDate endsAt);

    List<Subscription> findByStatusAndEndsAt(Subscription.SubscriptionStatus status, java.time.LocalDate endsAt);
}
