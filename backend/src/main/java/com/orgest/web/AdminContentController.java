package com.orgest.web;

import com.orgest.security.CurrentUser;
import com.orgest.service.ContentService;
import com.orgest.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Administration du contenu public : tarifs et blog. Réservé au rôle ADMIN (cf. SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminContentController {
    private final ContentService content;

    public AdminContentController(ContentService content) { this.content = content; }

    @GetMapping("/plans")
    public List<SubPlanDto> plans() { return content.allPlans(); }

    @PutMapping("/plans")
    public List<SubPlanDto> savePlans(@Valid @RequestBody PlansRequest r, HttpServletRequest req) {
        var me = CurrentUser.get();
        return content.savePlans(r, me.id(), me.username(), req.getRemoteAddr());
    }

    @GetMapping("/posts")
    public List<PostSummary> posts() { return content.allPosts(); }

    @GetMapping("/posts/{id}")
    public PostDto post(@PathVariable Long id) { return content.post(id); }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto create(@Valid @RequestBody PostIn in, HttpServletRequest req) {
        var me = CurrentUser.get();
        return content.createPost(in, me.id(), me.username(), req.getRemoteAddr());
    }

    @PutMapping("/posts/{id}")
    public PostDto update(@PathVariable Long id, @Valid @RequestBody PostIn in, HttpServletRequest req) {
        var me = CurrentUser.get();
        return content.updatePost(id, in, me.id(), me.username(), req.getRemoteAddr());
    }

    @DeleteMapping("/posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest req) {
        var me = CurrentUser.get();
        content.deletePost(id, me.id(), me.username(), req.getRemoteAddr());
    }

    @PostMapping(value = "/posts/{id}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostDto cover(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return content.setCover(id, file);
    }
}
