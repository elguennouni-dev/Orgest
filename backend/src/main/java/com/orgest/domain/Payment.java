package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "payment")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Enums.PayMethod method;
    @Column(nullable = false) public int months;
    public String reference;
    public String note;
    @Column(name = "period_start", nullable = false) public LocalDate periodStart;
    @Column(name = "period_end", nullable = false) public LocalDate periodEnd;
    @Column(name = "paid_at", nullable = false) public Instant paidAt = Instant.now();
}
