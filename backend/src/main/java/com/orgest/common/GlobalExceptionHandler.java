package com.orgest.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    ResponseEntity<Map<String, Object>> app(AppException e) {
        return ResponseEntity.status(e.status()).body(Map.of("code", e.code()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), "invalid"));
        return ResponseEntity.badRequest().body(Map.of("code", "VALIDATION", "fields", fields));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<Map<String, Object>> unreadable(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("code", "BAD_REQUEST"));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, Object>> tooBig(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.valueOf(413)).body(Map.of("code", "FILE_TOO_LARGE"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> integrity(DataIntegrityViolationException e) {
        log.warn("Data integrity violation: {}", e.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("code", "CONFLICT"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> other(Exception e) {
        if (e instanceof ErrorResponse er) {
            return ResponseEntity.status(er.getStatusCode()).body(Map.of("code", "HTTP_ERROR"));
        }
        log.error("Unhandled error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("code", "INTERNAL"));
    }
}
