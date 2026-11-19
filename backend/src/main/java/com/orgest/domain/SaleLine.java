package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "sale_line")
public class SaleLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "sale_id") public Sale sale;
    @Column(name = "item_id") public Long itemId;
    @Column(nullable = false) public String description;
    @Column(nullable = false) public int karat;
    @Column(name = "weight_g", nullable = false) public BigDecimal weightG;
    @Column(nullable = false) public int quantity = 1;
    @Column(name = "price_per_gram", nullable = false) public BigDecimal pricePerGram;
    @Column(name = "making_per_gram", nullable = false) public BigDecimal makingPerGram;
    @Column(name = "line_total", nullable = false) public BigDecimal lineTotal;
}
