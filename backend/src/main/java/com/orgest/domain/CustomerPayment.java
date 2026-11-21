package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/** Règlement d'un crédit client, rattaché à la vente (la plus ancienne d'abord) qu'il solde. */
@Entity
@Table(name = "customer_payment")
public class CustomerPayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(name = "customer_id", nullable = false) public Long customerId;
    @Column(name = "sale_id", nullable = false) public Long saleId;
    @Column(nullable = false) public BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Enums.SalePay method = Enums.SalePay.CASH;
    public String note;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
