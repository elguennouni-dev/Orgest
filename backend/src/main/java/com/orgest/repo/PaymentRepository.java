package com.orgest.repo;

import com.orgest.domain.Payment;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByShopIdOrderByPaidAtDesc(Long shopId);

    @Query("select coalesce(sum(p.amount),0) from Payment p where p.paidAt >= :from")
    BigDecimal revenueSince(@Param("from") Instant from);
}
