package com.orgest.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Pattern;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * L'API n'est destinée qu'à notre propre frontend : taper l'URL d'une route /api/… dans le navigateur, l'ouvrir depuis un
 * autre site ou l'appeler sans l'en-tête applicatif répond 404 (l'API ne confirme même pas son existence).
 *
 * <ul>
 *   <li>Le backend n'écoute que sur 127.0.0.1 : seul Nginx (le frontend) peut le joindre, voir deploy.sh.</li>
 *   <li>Requêtes fetch du frontend : en-tête {@code X-Orgest-Client: web} obligatoire (un en-tête personnalisé interdit
 *       aussi tout appel cross-site sans préflight CORS) et {@code Sec-Fetch-Site} doit valoir same-origin si le navigateur
 *       l'envoie (une URL tapée ou un lien externe envoie « none » / « cross-site »).</li>
 *   <li>Images (photos d'articles, couvertures du blog) : un {@code <img>} ne peut pas ajouter d'en-tête ; on exige alors
 *       {@code Sec-Fetch-Dest: image}. Les robots (Google, Facebook) n'envoient pas ces en-têtes : ils sont acceptés.</li>
 *   <li>Pages SEO et fichiers pour robots relayés par Nginx : publics par nature.</li>
 * </ul>
 * Ce filtre est un garde‑fou contre la curiosité ; la vraie protection des données reste l'authentification (JWT) et le CSRF.
 */
public class ApiGuardFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Orgest-Client";
    public static final String VALUE = "web";
    private static final Pattern OPEN = Pattern.compile("^/api/public/(seo/.*|robots\\.txt|llms\\.txt|llms-full\\.txt|sitemap\\.xml|feed\\.xml)$");
    private static final Pattern IMAGE = Pattern.compile("^/api/(public/blog-cover/[^/]+|shop/items/\\d+/photo)$");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String path = req.getRequestURI();
        if (!path.startsWith("/api/") || OPEN.matcher(path).matches()) { chain.doFilter(req, res); return; }
        String site = req.getHeader("Sec-Fetch-Site");
        if (site != null && !site.equals("same-origin")) { deny(res); return; }
        if (IMAGE.matcher(path).matches()) {
            String dest = req.getHeader("Sec-Fetch-Dest");
            if (dest != null && !dest.equals("image")) { deny(res); return; }
            chain.doFilter(req, res);
            return;
        }
        if (!VALUE.equals(req.getHeader(HEADER))) { deny(res); return; }
        chain.doFilter(req, res);
    }

    private static void deny(HttpServletResponse res) {
        res.setStatus(HttpServletResponse.SC_NOT_FOUND);
        res.setHeader("Cache-Control", "no-store");
    }
}
