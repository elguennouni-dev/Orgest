package com.orgest.repo;

import com.orgest.domain.GoldPrice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoldPriceRepository extends JpaRepository<GoldPrice, Long> {
    List<GoldPrice> findByShopIdOrderByKaratAsc(Long shopId);
    Optional<GoldPrice> findByShopIdAndKarat(Long shopId, int karat);
}
