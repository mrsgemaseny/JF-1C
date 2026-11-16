package com.example.zhanfinancebackend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.context.MessageSource;
import java.util.Locale;
import jakarta.persistence.OptimisticLockException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    // --- 400 Bad Request ---
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        String requestId = UUID.randomUUID().toString();
        List<ErrorResponse.ErrorDetail> details = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(err -> new ErrorResponse.ErrorDetail(err.getField(), err.getDefaultMessage()))
                .collect(Collectors.toList());

        log.warn("[{}] Validation failed: {}", requestId, 
                details.stream().map(d -> d.getField() + "=" + d.getError()).collect(Collectors.joining(", ")));
        
        String titleMessage = "Validation failed";
        try {
            titleMessage = messageSource.getMessage("error.validation.failed", null, titleMessage, request.getLocale());
        } catch (Exception ignored) {}

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_ERROR",
                titleMessage,
                details,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Malformed JSON or invalid enum payload: {}", requestId, exception.getMessage());

        String message = "Malformed request payload";
        List<ErrorResponse.ErrorDetail> details = null;

        Throwable cause = exception.getCause();
        if (cause instanceof com.fasterxml.jackson.databind.exc.InvalidFormatException ife) {
            String fieldName = ife.getPath().stream()
                    .map(com.fasterxml.jackson.databind.JsonMappingException.Reference::getFieldName)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.joining("."));
            if (fieldName.isBlank()) {
                fieldName = "unknown";
            }

            Class<?> targetType = ife.getTargetType();
            if (targetType != null && targetType.isEnum()) {
                Object[] enumConstants = targetType.getEnumConstants();
                String allowed = java.util.Arrays.stream(enumConstants)
                        .map(Object::toString)
                        .collect(Collectors.joining(", "));
                String errorMsg = String.format("Invalid value '%s' for enum %s. Allowed values: [%s]",
                        ife.getValue(), targetType.getSimpleName(), allowed);
                message = errorMsg;
                details = List.of(new ErrorResponse.ErrorDetail(fieldName, errorMsg));
            } else {
                String errorMsg = String.format("Cannot deserialize value '%s' to %s",
                        ife.getValue(), targetType != null ? targetType.getSimpleName() : "target type");
                message = errorMsg;
                details = List.of(new ErrorResponse.ErrorDetail(fieldName, errorMsg));
            }
        }

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_PAYLOAD",
                message,
                details,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException exception, HttpServletRequest request, Locale locale) {
        return buildResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", exception, request, locale);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Illegal argument at {}: {}", requestId, request.getRequestURI(), exception.getMessage());

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "BAD_REQUEST",
                exception.getMessage() != null ? exception.getMessage() : "Неверные параметры запроса",
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Type mismatch for parameter '{}' at {}: {}", requestId, exception.getName(), request.getRequestURI(), exception.getMessage());

        String message = "Неверный формат параметра запроса";
        try {
            message = messageSource.getMessage("error.invalid_parameter", null, message, locale);
        } catch (Exception ignored) {}

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_PARAMETER",
                message + (exception.getName() != null ? ": " + exception.getName() : ""),
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameter(
            org.springframework.web.bind.MissingServletRequestParameterException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Missing request parameter '{}' at {}", requestId, exception.getParameterName(), request.getRequestURI());

        String message = "Отсутствует обязательный параметр";
        try {
            message = messageSource.getMessage("error.missing_parameter", null, message, locale);
        } catch (Exception ignored) {}

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "MISSING_PARAMETER",
                message + (exception.getParameterName() != null ? ": " + exception.getParameterName() : ""),
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(
            org.springframework.web.multipart.MaxUploadSizeExceededException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] File upload size exceeded at {}: {}", requestId, request.getRequestURI(), exception.getMessage());

        String message = "Размер файла превышает допустимый лимит (20 МБ)";
        try {
            message = messageSource.getMessage("error.file_too_large", null, message, locale);
        } catch (Exception ignored) {}

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "FILE_TOO_LARGE",
                message,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            jakarta.validation.ConstraintViolationException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Constraint violation at {}: {}", requestId, request.getRequestURI(), exception.getMessage());

        List<ErrorResponse.ErrorDetail> details = exception.getConstraintViolations().stream()
                .map(cv -> new ErrorResponse.ErrorDetail(cv.getPropertyPath().toString(), cv.getMessage()))
                .collect(Collectors.toList());

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_ERROR",
                "Ошибка валидации параметров запроса",
                details,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    // --- 401 Unauthorized ---
    
    @ExceptionHandler({UnauthorizedException.class, org.springframework.security.core.AuthenticationException.class})
    public ResponseEntity<ErrorResponse> handleUnauthorized(Exception exception, HttpServletRequest request, Locale locale) {
        String message = exception.getMessage();
        try {
            if (exception instanceof org.springframework.security.authentication.BadCredentialsException) {
                message = messageSource.getMessage("error.bad.credentials", null, locale);
            } else if (exception instanceof org.springframework.security.core.userdetails.UsernameNotFoundException) {
                message = messageSource.getMessage("error.user.not.found", null, locale);
            } else {
                message = messageSource.getMessage("error.unauthorized", null, locale);
            }
        } catch (Exception e) {}
        
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Error 401: {}", requestId, exception.getMessage());
        
        ErrorResponse response = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "UNAUTHORIZED",
                message != null ? message : "Unauthorized",
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    // --- 403 Forbidden ---
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request, Locale locale) {
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", exception, request, locale);
    }

    // --- 404 Not Found ---
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException exception, HttpServletRequest request, Locale locale) {
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", exception, request, locale);
    }

    // --- 405 Method Not Allowed ---

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(org.springframework.web.HttpRequestMethodNotSupportedException exception, HttpServletRequest request) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Method Not Allowed (405) {}: {}", requestId, request.getMethod(), exception.getMessage());
        ErrorResponse response = new ErrorResponse(
                HttpStatus.METHOD_NOT_ALLOWED.value(),
                "METHOD_NOT_ALLOWED",
                exception.getMessage(),
                null,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(response);
    }

    // --- 409 Conflict ---
    
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException exception, HttpServletRequest request, Locale locale) {
        return buildResponse(HttpStatus.CONFLICT, "CONFLICT", exception, request, locale);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException exception,
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Data integrity violation at {}: {}", requestId, request.getRequestURI(), exception.getMessage());

        String message = "Запись с такими данными уже существует или нарушена целостность данных";
        try {
            message = messageSource.getMessage("error.data_integrity_violation", null, message, locale);
        } catch (Exception ignored) {}

        ErrorResponse response = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "DATA_CONFLICT",
                message,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler({OptimisticLockException.class, ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ErrorResponse> handleOptimisticLock(Exception exception, HttpServletRequest request) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Optimistic lock conflict at {}: {}", requestId, request.getRequestURI(), exception.getMessage());

        ErrorResponse response = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "OPTIMISTIC_LOCK_CONFLICT",
                "Запись была изменена другим пользователем. Обновите страницу и повторите.",
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    // --- 422 Unprocessable Entity ---
    
    @ExceptionHandler({InvalidStateException.class, UnprocessableEntityException.class})
    public ResponseEntity<ErrorResponse> handleUnprocessableEntity(RuntimeException exception, HttpServletRequest request, Locale locale) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, "UNPROCESSABLE_ENTITY", exception, request, locale);
    }

    // --- 429 Too Many Requests ---

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException exception, HttpServletRequest request, Locale locale) {
        return buildResponse(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", exception, request, locale);
    }

    // --- Legacy ApiException Mapping ---
    
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException exception, HttpServletRequest request, Locale locale) {
        HttpStatus status = exception.getErrorCode().getStatus();
        return buildResponse(status, exception.getErrorCode().name(), exception, request, locale);
    }

    // --- ResponseStatusException ---

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(org.springframework.web.server.ResponseStatusException exception, HttpServletRequest request, Locale locale) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String reason = exception.getReason() != null ? exception.getReason() : status.getReasonPhrase();
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] ResponseStatusException {}: {}", requestId, status.value(), reason);

        ErrorResponse response = new ErrorResponse(
                status.value(),
                status.name(),
                reason,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(status).body(response);
    }

    // --- 500 Internal Server Error ---
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request, Locale locale) {
        String requestId = UUID.randomUUID().toString();
        log.error("[{}] Unexpected internal error at {}: {}", requestId, request.getRequestURI(), exception.getMessage(), exception);
        
        String translatedMessage = "Internal server error. Reference ID: " + requestId;
        try {
            translatedMessage = messageSource.getMessage("error.internal", null, "Internal server error", locale) + ". Reference ID: " + requestId;
        } catch (Exception ignored) {}

        ErrorResponse response = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_ERROR",
                translatedMessage,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    // --- Utility ---

    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status, 
            String code, 
            Exception exception, 
            HttpServletRequest request,
            Locale locale
    ) {
        String requestId = UUID.randomUUID().toString();
        log.warn("[{}] Error {}: {}", requestId, status.value(), exception.getMessage());
        
        String translatedMessage = exception.getMessage();
        try {
            String messageKey = "error.internal";
            if (exception instanceof ResourceNotFoundException) messageKey = "error.resource.notFound";
            else if (exception instanceof org.springframework.security.authentication.BadCredentialsException) messageKey = "error.bad.credentials";
            else if (exception instanceof UnauthorizedException || exception instanceof org.springframework.security.core.AuthenticationException) messageKey = "error.unauthorized";
            else if (exception instanceof AccessDeniedException) messageKey = "error.access.denied";
            else if (exception instanceof ConflictException) {
                String msg = exception.getMessage();
                if (msg != null && msg.equals("EMAIL_ALREADY_REGISTERED")) {
                    messageKey = "error.email_already_registered";
                } else {
                    messageKey = "error.conflict";
                }
            }
            else if (exception instanceof BadRequestException || exception instanceof InvalidStateException || exception instanceof UnprocessableEntityException) {
                String msg = exception.getMessage();
                if (msg != null && msg.startsWith("error.")) {
                    messageKey = msg;
                } else {
                    messageKey = null;
                }
            }
            else if (exception instanceof ApiException apiEx) {
                String msg = exception.getMessage();
                if (msg == null || msg.equals(apiEx.getErrorCode().name()) || msg.equals(apiEx.getErrorCode().getMessage())) {
                    messageKey = "error." + apiEx.getErrorCode().name().toLowerCase();
                } else {
                    messageKey = null;
                }
            }
            
            if (messageKey != null) {
                translatedMessage = messageSource.getMessage(messageKey, null, exception.getMessage(), locale);
            }
        } catch (Exception e) {
            // fallback
        }

        ErrorResponse response = new ErrorResponse(
                status.value(),
                code,
                translatedMessage,
                request.getRequestURI(),
                requestId
        );
        return ResponseEntity.status(status).body(response);
    }
}
