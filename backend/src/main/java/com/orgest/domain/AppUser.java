package com.orgest.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "app_user")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false) public String username;
    @Column(name = "password_hash", nullable = false) public String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Enums.Role role;
    @Column(name = "shop_name") public String shopName;
    @Column(name = "owner_name") public String ownerName;
    public String phone;
    public String city;
    public String address;
    public String ice;
    @Column(name = "receipt_footer") public String receiptFooter;
    @Column(name = "logo_file") public String logoFile;
    @Column(nullable = false) public boolean active = true;
    @Column(name = "subscription_end") public LocalDate subscriptionEnd;
    @Column(name = "token_version", nullable = false) public int tokenVersion = 0;
    @Column(name = "failed_attempts", nullable = false) public int failedAttempts = 0;
    @Column(name = "locked_until") public Instant lockedUntil;
    /** Renseigné pour un employé (role STAFF) : id du commerçant propriétaire. */
    @Column(name = "owner_id") public Long ownerId;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();

    public boolean subscriptionValid() {
        return role == Enums.Role.ADMIN
                || (active && subscriptionEnd != null && !subscriptionEnd.isBefore(LocalDate.now()));
    }
}
