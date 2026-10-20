package com.example.zhanfinancebackend.modules.notifications.repository;

import com.example.zhanfinancebackend.modules.notifications.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, Long> {

    Optional<UserDeviceToken> findByUserIdAndDeviceId(Long userId, String deviceId);

    List<UserDeviceToken> findAllByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM UserDeviceToken d WHERE d.user.id = :userId AND d.deviceId = :deviceId")
    void deleteByUserIdAndDeviceId(@Param("userId") Long userId, @Param("deviceId") String deviceId);
}
