package com.orgest.repo;

import com.orgest.domain.Quote;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, Long> {
    Optional<Quote> findByIdAndShopId(Long id, Long shopId);
    Page<Quote> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);
}
