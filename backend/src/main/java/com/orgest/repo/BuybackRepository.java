package com.orgest.repo;

import com.orgest.domain.Buyback;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BuybackRepository extends JpaRepository<Buyback, Long> {
    Optional<Buyback> findByIdAndShopId(Long id, Long shopId);
    Page<Buyback> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);

    @Query("select coalesce(sum(b.total),0) from Buyback b where b.shopId = :shop and b.createdAt >= :from and b.createdAt < :to")
    BigDecimal totalBetween(@Param("shop") Long shop, @Param("from") Instant from, @Param("to") Instant to);

    @Query("select coalesce(sum(b.netWeightG),0) from Buyback b where b.shopId = :shop and b.createdAt >= :from and b.createdAt < :to")
    BigDecimal weightBetween(@Param("shop") Long shop, @Param("from") Instant from, @Param("to") Instant to);
}
