package com.orgest.repo;

import com.orgest.domain.PushSubscription;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByShopId(Long shopId);
    Optional<PushSubscription> findByEndpoint(String endpoint);
    long deleteByEndpointAndShopId(String endpoint, Long shopId);
    long countByShopId(Long shopId);
}
