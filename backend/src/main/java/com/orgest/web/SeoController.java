package com.orgest.web;

import com.orgest.service.SeoService;
import com.orgest.service.SeoService.Faq;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Pages et fichiers SEO publics. Nginx relaie /, /blog, /blog/{slug}, /robots.txt, /llms.txt, /sitemap.xml, /feed.xml vers ces points. */
@RestController
@RequestMapping("/api/public")
public class SeoController {
    private static final String CACHE = "public, max-age=300";
    private final SeoService seo;

    public SeoController(SeoService seo) { this.seo = seo; }

    private String base(HttpServletRequest r) {
        return seo.baseUrl(r.getHeader("X-Forwarded-Host"), r.getHeader("Host"), r.getHeader("X-Forwarded-Proto"));
    }

    private static ResponseEntity<String> text(String body, String type, String subtype, String cache) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, cache).contentType(new MediaType(type, subtype, StandardCharsets.UTF_8)).body(body);
    }

    private static ResponseEntity<String> page(SeoService.Page p) {
        return ResponseEntity.status(p.status()).header(HttpHeaders.CACHE_CONTROL, p.status() == 200 ? "public, max-age=60" : "no-store")
                .contentType(new MediaType("text", "html", StandardCharsets.UTF_8)).body(p.html());
    }

    @GetMapping("/seo/home") public ResponseEntity<String> home(HttpServletRequest r) { return page(seo.home(base(r))); }
    @GetMapping("/seo/blog") public ResponseEntity<String> blog(HttpServletRequest r) { return page(seo.blog(base(r))); }
    @GetMapping("/seo/blog-lang/{lang}") public ResponseEntity<String> blogLang(@PathVariable String lang, HttpServletRequest r) { return page(seo.blog(base(r), lang)); }
    @GetMapping("/seo/blog/{slug}") public ResponseEntity<String> post(@PathVariable String slug, HttpServletRequest r) { return page(seo.post(base(r), slug)); }

    @GetMapping("/seo/tools") public ResponseEntity<String> tools(HttpServletRequest r) { return page(seo.tools(base(r))); }
    @GetMapping("/seo/tools/{slug}") public ResponseEntity<String> tool(@PathVariable String slug, HttpServletRequest r) { return page(seo.tool(base(r), slug)); }
    @GetMapping("/tools") public ResponseEntity<List<com.orgest.service.ToolCatalog.Tool>> toolCatalog() { return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "public, max-age=300").body(com.orgest.service.ToolCatalog.ALL); }

    @GetMapping("/faq") public ResponseEntity<List<Faq>> faq() { return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "public, max-age=300").body(seo.faq()); }

    @GetMapping("/robots.txt") public ResponseEntity<String> robots(HttpServletRequest r) { return text(seo.robots(base(r)), "text", "plain", CACHE); }
    @GetMapping("/llms.txt") public ResponseEntity<String> llms(HttpServletRequest r) { return text(seo.llms(base(r)), "text", "plain", CACHE); }
    @GetMapping("/llms-full.txt") public ResponseEntity<String> llmsFull(HttpServletRequest r) { return text(seo.llmsFull(base(r)), "text", "plain", CACHE); }
    @GetMapping("/sitemap.xml") public ResponseEntity<String> sitemap(HttpServletRequest r) { return text(seo.sitemap(base(r)), "application", "xml", CACHE); }
    @GetMapping("/feed.xml") public ResponseEntity<String> feed(HttpServletRequest r) { return text(seo.feed(base(r)), "application", "rss+xml", CACHE); }
}
