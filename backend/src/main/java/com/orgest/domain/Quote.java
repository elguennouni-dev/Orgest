package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quote")
public class Quote {
    public enum Status { DRAFT, SENT, ACCEPTED, REJECTED, CONVERTED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String number;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Status status = Status.DRAFT;
    @Column(name = "customer_name") public String customerName;
    @Column(name = "customer_phone") public String customerPhone;
    public String note;
    @Column(name = "valid_until", nullable = false) public LocalDate validUntil;
    @Column(nullable = false) public BigDecimal subtotal = BigDecimal.ZERO;
    @Column(name = "sale_id") public Long saleId;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
    @OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    public List<QuoteLine> lines = new ArrayList<>();
}
