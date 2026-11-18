package com.orgest.web;

import com.orgest.service.ContentService;
import com.orgest.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Contenu public (lecture seule, sans authentification) : tarifs, blog, couvertures, sitemap. */
@RestController
@RequestMapping("/api/public")
public class PublicController {
    private static final Pattern HOST = Pattern.compile("^[A-Za-z0-9.-]{1,100}(:\\d{1,5})?$");
    private static final String CACHE = "public, max-age=60";
    private final ContentService content;

    public PublicController(ContentService content) { this.content = content; }

    @GetMapping("/plans")
    public ResponseEntity<List<SubPlanDto>> plans() {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, CACHE).body(content.publicPlans());
    }

    @GetMapping("/posts")
    public ResponseEntity<List<PostSummary>> posts() {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, CACHE).body(content.publicPosts());
    }

    @GetMapping("/posts/{slug}")
    public ResponseEntity<PostDto> post(@PathVariable String slug) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, CACHE).body(content.publicPost(slug));
    }

    @GetMapping("/blog-cover/{name}")
    public ResponseEntity<Resource> cover(@PathVariable String name) throws IOException {
        Path p = content.coverPath(name);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentLength(Files.size(p))
                .body(new FileSystemResource(p));
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap(HttpServletRequest req) {
        String host = req.getHeader("X-Forwarded-Host") != null ? req.getHeader("X-Forwarded-Host") : req.getHeader("Host");
        if (host == null || !HOST.matcher(host).matches()) host = "localhost";
        String proto = "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto")) ? "https" : "http";
        String base = proto + "://" + host;
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        sb.append("<url><loc>").append(base).append("/</loc></url>\n<url><loc>").append(base).append("/blog</loc></url>\n");
        for (PostSummary p : content.publicPosts()) {
            sb.append("<url><loc>").append(base).append("/blog/").append(p.slug()).append("</loc><lastmod>")
              .append(p.updatedAt().toString().substring(0, 10)).append("</lastmod></url>\n");
        }
        sb.append("</urlset>\n");
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
                .contentType(new MediaType("application", "xml", StandardCharsets.UTF_8)).body(sb.toString());
    }
}
