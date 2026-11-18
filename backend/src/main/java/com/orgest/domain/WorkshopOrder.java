package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "workshop_order")
public class WorkshopOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String number;
    @Column(name = "customer_name") public String customerName;
    @Column(name = "customer_phone") public String customerPhone;
    @Column(nullable = false) public String description;
    @Column(nullable = false) public int karat;
    @Column(name = "artisan_name", nullable = false) public String artisanName;
    @Column(name = "artisan_phone") public String artisanPhone;
    @Column(name = "given_weight_g", nullable = false) public BigDecimal givenWeightG = BigDecimal.ZERO;
    @Column(name = "received_weight_g") public BigDecimal receivedWeightG;
    @Column(name = "labour_cost", nullable = false) public BigDecimal labourCost = BigDecimal.ZERO;
    @Column(name = "deposit_amount", nullable = false) public BigDecimal depositAmount = BigDecimal.ZERO;
    @Column(name = "agreed_price", nullable = false) public BigDecimal agreedPrice = BigDecimal.ZERO;
    @Column(name = "due_date") public LocalDate dueDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Enums.WorkshopStatus status = Enums.WorkshopStatus.SENT;
    public String note;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
