package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "plan")
public class Plan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false) public int months;
    @Column(nullable = false) public BigDecimal price;
    @Column(nullable = false) public boolean popular;
    @Column(nullable = false) public boolean active = true;
}
