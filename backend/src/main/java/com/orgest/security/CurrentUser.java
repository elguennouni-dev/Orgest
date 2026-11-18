package com.orgest.security;

import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser() {}

    public static UserPrincipal get() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal p)) {
            throw new IllegalStateException("No authenticated user");
        }
        return p;
    }

    /** Identifiant du commerçant connecté : TOUTES les requêtes métier sont filtrées avec cet id (isolation des tenants). */
    public static Long shopId() { return get().id(); }
}
