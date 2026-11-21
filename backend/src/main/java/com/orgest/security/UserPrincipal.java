package com.orgest.security;

import com.orgest.domain.Enums;

/**
 * @param id       identifiant du COMMERÇANT (tenant) : pour un employé, c'est l'id du propriétaire ; toutes les requêtes métier sont filtrées avec.
 * @param userId   identifiant réel du compte connecté (employé ou commerçant).
 */
public record UserPrincipal(Long id, Enums.Role role, String username, Long userId) {
    public boolean owner() { return role != Enums.Role.STAFF; }
}
