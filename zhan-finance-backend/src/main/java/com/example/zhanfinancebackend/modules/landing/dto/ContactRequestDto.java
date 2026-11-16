package com.example.zhanfinancebackend.modules.landing.dto;

import com.example.zhanfinancebackend.modules.landing.entity.ContactRequest.ContactRequestStatus;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ContactRequestDto(
        Long id,
        String name,
        String phone,
        String email,
        String message,
        String source,
        ContactRequestStatus status,
        Instant createdAt,
        Instant updatedAt,
        String uploadToken
) {
    public ContactRequestDto(Long id, String name, String phone, String email, String message, String source,
                             ContactRequestStatus status, Instant createdAt, Instant updatedAt) {
        this(id, name, phone, email, message, source, status, createdAt, updatedAt, null);
    }

    public ContactRequestDto withUploadToken(String token) {
        return new ContactRequestDto(id, name, phone, email, message, source, status, createdAt, updatedAt, token);
    }
}
