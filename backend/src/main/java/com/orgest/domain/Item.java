package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "item")
public class Item {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String ref;
    @Column(nullable = false) public String name;
    @Column(nullable = false) public String category;
    @Column(nullable = false) public int karat;
    @Column(name = "weight_g", nullable = false) public BigDecimal weightG;
    /** Nombre de pièces en stock (poids = par pièce). À 0 l'article reste en base, marqué épuisé. */
    @Column(nullable = false) public int quantity = 1;
    @Column(name = "making_per_gram", nullable = false) public BigDecimal makingPerGram = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Enums.ItemStatus status = Enums.ItemStatus.IN_STOCK;
    @Column(name = "photo_file") public String photoFile;
    public String note;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
}
