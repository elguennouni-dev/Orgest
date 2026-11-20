package com.orgest.service;

import com.orgest.common.AppException;
import com.orgest.common.Text;
import com.orgest.domain.BlogPost;
import com.orgest.domain.Plan;
import com.orgest.repo.BlogPostRepository;
import com.orgest.repo.PlanRepository;
import com.orgest.web.Dtos.*;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Contenu éditable par l'administrateur : tarifs et articles de blog (SEO). */
@Service
public class ContentService {
    /** Les couvertures de blog sont stockées sous l'identifiant 0 (aucun commerçant n'a l'id 0). */
    private static final Long COVER_OWNER = 0L;
    private final PlanRepository plans;
    private final BlogPostRepository posts;
    private final PhotoService photos;
    private final AuditService audit;

    public ContentService(PlanRepository plans, BlogPostRepository posts, PhotoService photos, AuditService audit) {
        this.plans = plans;
        this.posts = posts;
        this.photos = photos;
        this.audit = audit;
    }

    // ---------- Tarifs ----------
    private static SubPlanDto dto(Plan p) { return new SubPlanDto(p.id, p.months, p.price, p.popular, p.active); }

    public List<SubPlanDto> publicPlans() { return plans.findByActiveTrueOrderByMonthsAsc().stream().map(ContentService::dto).toList(); }

    public List<SubPlanDto> allPlans() { return plans.findAllByOrderByMonthsAsc().stream().map(ContentService::dto).toList(); }

    @Transactional
    public List<SubPlanDto> savePlans(PlansRequest r, Long adminId, String admin, String ip) {
        Set<Integer> seen = new HashSet<>();
        int popular = 0;
        for (PlanIn p : r.plans()) {
            if (!seen.add(p.months())) throw AppException.bad("DUPLICATE_PLAN");
            if (p.popular()) popular++;
        }
        if (popular > 1) throw AppException.bad("ONE_POPULAR_ONLY");
        plans.deleteAllInBatch();
        plans.flush();
        for (PlanIn in : r.plans()) {
            Plan p = new Plan();
            p.months = in.months();
            p.price = in.price();
            p.popular = in.popular();
            p.active = in.active();
            plans.save(p);
        }
        audit.log(adminId, admin, "PLANS_UPDATED", r.plans().size() + " plans", ip);
        return allPlans();
    }

    // ---------- Blog ----------
    private static PostSummary summary(BlogPost p) {
        return new PostSummary(p.id, p.slug, p.title, p.excerpt, p.category, p.cover, p.coverAlt, p.readMinutes, p.published, p.publishedAt, p.updatedAt, p.lang);
    }

    private static PostDto dto(BlogPost p) {
        return new PostDto(p.id, p.slug, p.title, p.excerpt, p.content, p.category, p.cover, p.coverAlt, p.metaTitle,
                p.metaDescription, p.keywords, p.readMinutes, p.published, p.publishedAt, p.updatedAt, p.lang);
    }

    public List<PostSummary> publicPosts() { return posts.findByPublishedTrueOrderByPublishedAtDesc().stream().map(ContentService::summary).toList(); }

    public PostDto publicPost(String slug) { return dto(posts.findBySlugAndPublishedTrue(slug).orElseThrow(AppException::notFound)); }

    public List<PostSummary> allPosts() { return posts.findAllByOrderByUpdatedAtDesc().stream().map(ContentService::summary).toList(); }

    public PostDto post(Long id) { return dto(posts.findById(id).orElseThrow(AppException::notFound)); }

    private void apply(BlogPost p, PostIn in) {
        p.slug = in.slug();
        p.title = Text.clean(in.title(), 160);
        p.excerpt = Text.blankToNull(Text.clean(in.excerpt(), 300));
        p.content = in.content().strip();
        p.category = Text.blankToNull(Text.clean(in.category(), 60));
        p.coverAlt = Text.blankToNull(Text.clean(in.coverAlt(), 160));
        p.metaTitle = Text.blankToNull(Text.clean(in.metaTitle(), 70));
        p.metaDescription = Text.blankToNull(Text.clean(in.metaDescription(), 170));
        p.keywords = Text.blankToNull(Text.clean(in.keywords(), 200));
        p.readMinutes = in.readMinutes();
        if (in.lang() != null) p.lang = in.lang();
        if (in.published() && !p.published) p.publishedAt = Instant.now();
        if (!in.published()) p.publishedAt = null;
        p.published = in.published();
        p.updatedAt = Instant.now();
    }

    @Transactional
    public PostDto createPost(PostIn in, Long adminId, String admin, String ip) {
        if (posts.existsBySlug(in.slug())) throw AppException.conflict("SLUG_TAKEN");
        BlogPost p = new BlogPost();
        apply(p, in);
        posts.save(p);
        audit.log(adminId, admin, "POST_CREATED", p.slug, ip);
        return dto(p);
    }

    @Transactional
    public PostDto updatePost(Long id, PostIn in, Long adminId, String admin, String ip) {
        BlogPost p = posts.findById(id).orElseThrow(AppException::notFound);
        if (!p.slug.equals(in.slug()) && posts.existsBySlug(in.slug())) throw AppException.conflict("SLUG_TAKEN");
        apply(p, in);
        audit.log(adminId, admin, "POST_UPDATED", p.slug, ip);
        return dto(p);
    }

    @Transactional
    public void deletePost(Long id, Long adminId, String admin, String ip) {
        BlogPost p = posts.findById(id).orElseThrow(AppException::notFound);
        photos.delete(COVER_OWNER, p.cover);
        posts.delete(p);
        audit.log(adminId, admin, "POST_DELETED", p.slug, ip);
    }

    @Transactional
    public PostDto setCover(Long id, MultipartFile file) {
        BlogPost p = posts.findById(id).orElseThrow(AppException::notFound);
        String name = photos.store(COVER_OWNER, file);
        photos.delete(COVER_OWNER, p.cover);
        p.cover = name;
        p.updatedAt = Instant.now();
        return dto(p);
    }

    public Path coverPath(String name) { return photos.resolve(COVER_OWNER, name); }
}
