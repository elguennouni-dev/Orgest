package com.orgest.security;

import com.orgest.domain.AppUser;
import com.orgest.domain.Enums;
import com.orgest.repo.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Lit le JWT dans le cookie HttpOnly, recharge l'utilisateur en base (suspension, expiration,
 * changement de mot de passe => invalidation immédiate) et applique le blocage d'abonnement.
 */
public class JwtAuthFilter extends OncePerRequestFilter {
    public static final String COOKIE = "orgest_token";
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String token = readCookie(req);
        if (token != null) {
            var parsed = jwt.parse(token);
            if (parsed.isPresent()) {
                try {
                    long id = Long.parseLong(parsed.get().getSubject());
                    Number tv = parsed.get().getClaim("tv");
                    AppUser u = users.findById(id).orElse(null);
                    if (u != null && tv != null && tv.intValue() == u.tokenVersion) {
                        if (u.role == Enums.Role.SHOP && !u.subscriptionValid() && isBlocked(req)) {
                            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"code\":\"SUBSCRIPTION_EXPIRED\"}");
                            return;
                        }
                        var principal = new UserPrincipal(u.id, u.role, u.username);
                        var auth = new UsernamePasswordAuthenticationToken(principal, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + u.role.name())));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                } catch (NumberFormatException ignored) {
                    // jeton invalide : requête traitée comme anonyme
                }
            }
        }
        chain.doFilter(req, res);
    }

    /** Un abonnement expiré/suspendu ne garde accès qu'au compte (pour voir l'état et changer le mot de passe). */
    private boolean isBlocked(HttpServletRequest req) {
        String p = req.getRequestURI();
        return p.startsWith("/api/shop/") && !p.startsWith("/api/shop/account");
    }

    private String readCookie(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (COOKIE.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) return c.getValue();
        }
        return null;
    }
}
