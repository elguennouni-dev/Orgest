package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "gold_price")
public class GoldPrice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public int karat;
    @Column(name = "sell_per_gram", nullable = false) public BigDecimal sellPerGram;
    @Column(name = "buy_per_gram", nullable = false) public BigDecimal buyPerGram;
    @Column(name = "updated_at", nullable = false) public Instant updatedAt = Instant.now();
}
