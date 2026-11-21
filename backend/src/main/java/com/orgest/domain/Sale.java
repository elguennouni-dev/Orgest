package com.orgest.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sale")
public class Sale {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "shop_id", nullable = false) public Long shopId;
    @Column(nullable = false) public String number;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Enums.SaleType type;
    @Column(name = "customer_name") public String customerName;
    @Column(name = "customer_phone") public String customerPhone;
    @Column(nullable = false) public BigDecimal subtotal;
    @Column(name = "trade_in_amount", nullable = false) public BigDecimal tradeInAmount = BigDecimal.ZERO;
    @Column(name = "buyback_id") public Long buybackId;
    @Column(nullable = false) public BigDecimal balance;
    @Enumerated(EnumType.STRING) @Column(name = "payment_mode", nullable = false) public Enums.PaymentMode paymentMode;
    @Column(name = "down_payment", nullable = false) public BigDecimal downPayment = BigDecimal.ZERO;
    @Column(nullable = false) public int months;
    /** Identifiant généré par le client (vente saisie hors ligne puis synchronisée) : rend l'envoi idempotent. */
    @Column(name = "client_ref") public String clientRef;
    @Column(name = "customer_id") public Long customerId;
    /** Reste dû par le client pour une vente à crédit (0 sinon). */
    @Column(name = "credit_due", nullable = false) public BigDecimal creditDue = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(name = "pay_method", nullable = false) public Enums.SalePay payMethod = Enums.SalePay.CASH;
    @Column(name = "created_at", nullable = false) public Instant createdAt = Instant.now();
    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<SaleLine> lines = new ArrayList<>();
}
