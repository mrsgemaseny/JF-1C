package com.example.zhanfinancebackend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerResponseStatusTest {

    @Mock
    private MessageSource messageSource;

    @Mock
    private HttpServletRequest request;

    private GlobalExceptionHandler globalExceptionHandler;

    @BeforeEach
    void setUp() {
        globalExceptionHandler = new GlobalExceptionHandler(messageSource);
        when(request.getRequestURI()).thenReturn("/api/v1/test-endpoint");
    }

    @Test
    @DisplayName("W7 Regression: ResponseStatusException(404) returns structured JSON with 404 status and requestId")
    void handleResponseStatusException_notFound() {
        ResponseStatusException exception = new ResponseStatusException(HttpStatus.NOT_FOUND, "Document template not found");

        ResponseEntity<ErrorResponse> responseEntity = globalExceptionHandler.handleResponseStatusException(exception, request, Locale.ENGLISH);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
        ErrorResponse body = responseEntity.getBody();
        assertNotNull(body);
        assertEquals(404, body.getStatus());
        assertEquals("NOT_FOUND", body.getCode());
        assertEquals("Document template not found", body.getMessage());
        assertEquals("/api/v1/test-endpoint", body.getPath());
        assertNotNull(body.getRequestId());
        assertFalse(body.getRequestId().isBlank());
    }

    @Test
    @DisplayName("W7 Regression: ResponseStatusException(400) returns structured JSON with 400 status")
    void handleResponseStatusException_badRequest() {
        ResponseStatusException exception = new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file format");

        ResponseEntity<ErrorResponse> responseEntity = globalExceptionHandler.handleResponseStatusException(exception, request, Locale.ENGLISH);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());
        ErrorResponse body = responseEntity.getBody();
        assertNotNull(body);
        assertEquals(400, body.getStatus());
        assertEquals("BAD_REQUEST", body.getCode());
        assertEquals("Invalid file format", body.getMessage());
        assertNotNull(body.getRequestId());
    }
}
