package com.orgest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "user_id") public Long userId;
    public String username;
    @Column(nullable = false) public String action;
    public String detail;
    public String ip;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
