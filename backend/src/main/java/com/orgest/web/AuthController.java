package com.orgest.web;

import com.orgest.common.AppException;
import com.orgest.config.OrgestProperties;
import com.orgest.domain.AppUser;
import com.orgest.repo.UserRepository;
import com.orgest.security.CurrentUser;
import com.orgest.security.JwtAuthFilter;
import com.orgest.security.JwtService;
import com.orgest.service.AuthService;
import com.orgest.web.Dtos.LoginRequest;
import com.orgest.web.Dtos.MeResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final JwtService jwt;
    private final OrgestProperties props;
    private final UserRepository users;

    public AuthController(AuthService auth, JwtService jwt, OrgestProperties props, UserRepository users) {
        this.auth = auth;
        this.jwt = jwt;
        this.props = props;
        this.users = users;
    }

    /** Le filtre CSRF dépose le cookie XSRF-TOKEN ; le SPA l'appelle au démarrage. */
    @GetMapping("/csrf")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void csrf() {}

    @PostMapping("/login")
    public MeResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest req, HttpServletResponse res) {
        AppUser u = auth.authenticate(body.username(), body.password(), req.getRemoteAddr());
        setCookie(res, jwt.issue(u), jwt.ttl());
        return AuthService.toMe(u);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletResponse res) {
        setCookie(res, "", Duration.ZERO);
    }

    @GetMapping("/me")
    public MeResponse me() {
        AppUser u = users.findById(CurrentUser.get().id()).orElseThrow(AppException::notFound);
        return AuthService.toMe(u);
    }

    public void setCookie(HttpServletResponse res, String value, Duration maxAge) {
        ResponseCookie c = ResponseCookie.from(JwtAuthFilter.COOKIE, value)
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }
}
