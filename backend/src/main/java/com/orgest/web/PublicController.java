package com.orgest.web;

import com.orgest.service.ContentService;
import com.orgest.web.Dtos.*;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Contenu public (lecture seule, sans authentification) : tarifs, blog, couvertures. */
@RestController
@RequestMapping("/api/public")
public class PublicController {
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
}
