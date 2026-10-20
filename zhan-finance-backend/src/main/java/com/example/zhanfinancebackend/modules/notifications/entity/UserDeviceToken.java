package com.example.zhanfinancebackend.modules.notifications.entity;

import com.example.zhanfinancebackend.modules.auth.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_device_tokens",
    uniqueConstraints = @UniqueConstraint(name = "uq_user_device_token", columnNames = {"user_id", "device_id"})
)
public class UserDeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "device_id", nullable = false, length = 128)
    private String deviceId;

    @Column(name = "push_token", nullable = false, length = 512)
    private String pushToken;

    @Column(name = "platform", nullable = false, length = 32)
    private String platform = "ANDROID";

    @Column(name = "device_name", length = 255)
    private String deviceName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt = LocalDateTime.now();

    protected UserDeviceToken() {}

    public UserDeviceToken(User user, String deviceId, String pushToken, String platform, String deviceName) {
        this.user = user;
        this.deviceId = deviceId;
        this.pushToken = pushToken;
        this.platform = platform != null ? platform : "ANDROID";
        this.deviceName = deviceName;
        this.lastSeenAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getDeviceId() { return deviceId; }
    public String getPushToken() { return pushToken; }
    public void setPushToken(String pushToken) { this.pushToken = pushToken; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
