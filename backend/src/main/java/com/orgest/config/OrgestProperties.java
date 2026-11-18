package com.orgest.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orgest")
public record OrgestProperties(
        String jwtSecret,
        int jwtTtlHours,
        boolean cookieSecure,
        String uploadDir,
        String adminUsername,
        String adminPassword,
        int maxLoginAttempts,
        int lockMinutes) {}
