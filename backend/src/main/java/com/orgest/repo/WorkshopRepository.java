package com.orgest.repo;

import com.orgest.domain.Enums;
import com.orgest.domain.WorkshopOrder;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkshopRepository extends JpaRepository<WorkshopOrder, Long> {
    Optional<WorkshopOrder> findByIdAndShopId(Long id, Long shopId);
    List<WorkshopOrder> findByShopIdOrderByCreatedAtDesc(Long shopId);
    long countByShopIdAndStatusIn(Long shopId, java.util.Collection<Enums.WorkshopStatus> statuses);
}
