package com.orgest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "push_subscription")
public class PushSubscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String endpoint;
    @Column(nullable = false) public String p256dh;
    @Column(nullable = false) public String auth;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
