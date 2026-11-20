package com.orgest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "blog_post")
public class BlogPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false) public String slug;
    @Column(nullable = false) public String title;
    public String excerpt;
    @Column(nullable = false, columnDefinition = "text") public String content;
    public String category;
    public String cover;
    @Column(name = "cover_alt") public String coverAlt;
    @Column(name = "meta_title") public String metaTitle;
    @Column(name = "meta_description") public String metaDescription;
    public String keywords;
    @Column(nullable = false, length = 2) public String lang = "fr";
    @Column(name = "read_minutes", nullable = false) public int readMinutes = 3;
    @Column(nullable = false) public boolean published;
    @Column(name = "published_at") public Instant publishedAt;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) public Instant updatedAt = Instant.now();
}
