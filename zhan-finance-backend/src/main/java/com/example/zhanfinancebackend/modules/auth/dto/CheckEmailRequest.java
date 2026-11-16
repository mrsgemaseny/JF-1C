package com.example.zhanfinancebackend.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CheckEmailRequest(
    @NotBlank @Email String email
) {}
