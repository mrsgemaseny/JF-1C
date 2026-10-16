package com.example.zhanfinancebackend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.registerCustomCache("dashboard",
                Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(100).recordStats().build());
        manager.registerCustomCache("dashboard_admin",
                Caffeine.newBuilder().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(100).recordStats().build());
        manager.registerCustomCache("dashboard_employee",
                Caffeine.newBuilder().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(100).recordStats().build());
        manager.registerCustomCache("dashboard_client",
                Caffeine.newBuilder().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(100).recordStats().build());
        manager.registerCustomCache("tasks",
                Caffeine.newBuilder().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(500).recordStats().build());

        manager.registerCustomCache("users",
                Caffeine.newBuilder().expireAfterWrite(300, TimeUnit.SECONDS).maximumSize(200).recordStats().build());
        manager.registerCustomCache("courses",
                Caffeine.newBuilder().expireAfterWrite(120, TimeUnit.SECONDS).maximumSize(100).recordStats().build());
        manager.registerCustomCache("pipelines",
                Caffeine.newBuilder().expireAfterWrite(600, TimeUnit.SECONDS).maximumSize(50).recordStats().build());
        manager.setCaffeine(
                Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(300).recordStats());
        return manager;
    }
}
