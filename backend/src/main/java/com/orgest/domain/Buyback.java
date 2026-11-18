package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "buyback")
public class Buyback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String number;
    @Column(name = "customer_name") public String customerName;
    @Column(name = "customer_phone") public String customerPhone;
    @Column(name = "customer_cin") public String customerCin;
    public String description;
    @Column(nullable = false) public int karat;
    @Column(name = "gross_weight_g", nullable = false) public BigDecimal grossWeightG;
    @Column(name = "deduction_pct", nullable = false) public BigDecimal deductionPct;
    @Column(name = "net_weight_g", nullable = false) public BigDecimal netWeightG;
    @Column(name = "price_per_gram", nullable = false) public BigDecimal pricePerGram;
    @Column(nullable = false) public BigDecimal total;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
