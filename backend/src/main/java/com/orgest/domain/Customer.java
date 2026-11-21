package com.orgest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "customer")
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String name;
    public String phone;
    public String note;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
