package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "installment")
public class Installment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "sale_id", nullable = false) public Long saleId;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public int seq;
    @Column(name = "due_date", nullable = false) public LocalDate dueDate;
    @Column(nullable = false) public BigDecimal amount;
    @Column(nullable = false) public boolean paid;
    @Column(name = "paid_at") public Instant paidAt;
}
