package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Money;
import com.orgest.config.OrgestProperties;
import com.orgest.domain.AppUser;
import com.orgest.repo.UserRepository;
import com.orgest.security.LoginRateLimiter;
import com.orgest.web.Dtos.MeResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final OrgestProperties props;
    private final LoginRateLimiter limiter;
    private final AuditService audit;
    /** Hash factice : comparaison à temps constant même si l'utilisateur n'existe pas (anti-énumération). */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder, OrgestProperties props,
                       LoginRateLimiter limiter, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
        this.limiter = limiter;
        this.audit = audit;
        this.dummyHash = encoder.encode("orgest-dummy-password");
    }

    public AppUser authenticate(String username, String password, String ip) {
        if (!limiter.allowed(ip)) throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS");
        limiter.record(ip);

        AppUser u = users.findByUsernameIgnoreCase(username.trim()).orElse(null);
        if (u == null) {
            encoder.matches(password, dummyHash);
            audit.log(null, username, "LOGIN_FAIL", "unknown user", ip);
            throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }
        if (u.lockedUntil != null && u.lockedUntil.isAfter(Instant.now())) {
            audit.log(u.id, u.username, "LOGIN_LOCKED", null, ip);
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED");
        }
        if (!encoder.matches(password, u.passwordHash)) {
            u.failedAttempts++;
            if (u.failedAttempts >= props.maxLoginAttempts()) {
                u.lockedUntil = Instant.now().plus(props.lockMinutes(), ChronoUnit.MINUTES);
                u.failedAttempts = 0;
            }
            users.save(u);
            audit.log(u.id, u.username, "LOGIN_FAIL", "bad password", ip);
            throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }
        u.failedAttempts = 0;
        u.lockedUntil = null;
        users.save(u);
        audit.log(u.id, u.username, "LOGIN_OK", null, ip);
        return u;
    }

    public static MeResponse toMe(AppUser u) {
        long days = u.subscriptionEnd == null ? 0
                : java.time.temporal.ChronoUnit.DAYS.between(Money.today(), u.subscriptionEnd);
        return new MeResponse(u.id, u.username, u.role.name(), u.shopName, u.ownerName, u.phone, u.city, u.address,
                u.ice, u.receiptFooter, u.active, u.subscriptionEnd, u.subscriptionValid(), days);
    }
}
