package com.orgest.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

/** Force l'écriture du cookie XSRF-TOKEN (le SPA le renvoie dans l'en-tête X-XSRF-TOKEN). */
public class CsrfCookieFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Object attr = req.getAttribute(CsrfToken.class.getName());
        if (attr instanceof CsrfToken token) {
            token.getToken();
        }
        chain.doFilter(req, res);
    }
}
