package com.orgest.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** En-têtes de sécurité (OWASP A05). Le frontend statique reçoit les mêmes en-têtes via Nginx (voir deploy.sh). */
public class SecurityHeadersFilter extends OncePerRequestFilter {
    /** API JSON : rien à charger. */
    static final String API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
    /** Pages HTML SEO (/api/public/seo/** relayées par Nginx pour /, /blog, /outils) : même politique que le frontend statique. */
    static final String PAGE_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    static final String SEO_PAGES = "/api/public/seo/";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        res.setHeader("Content-Security-Policy", req.getRequestURI().startsWith(SEO_PAGES) ? PAGE_CSP : API_CSP);
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (req.isSecure()) {
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        chain.doFilter(req, res);
    }
}
