package com.orgest.common;

import org.springframework.http.HttpStatus;

/** Erreur métier : code stable pour le frontend, message générique (pas de fuite d'informations). */
public class AppException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AppException(HttpStatus status, String code) {
        super(code);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }

    public static AppException notFound() { return new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND"); }
    public static AppException bad(String code) { return new AppException(HttpStatus.BAD_REQUEST, code); }
    public static AppException conflict(String code) { return new AppException(HttpStatus.CONFLICT, code); }
}
