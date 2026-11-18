package com.orgest.security;

import com.orgest.domain.Enums;

public record UserPrincipal(Long id, Enums.Role role, String username) {}
