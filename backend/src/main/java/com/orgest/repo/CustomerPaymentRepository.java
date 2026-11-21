package com.orgest.repo;

import com.orgest.domain.CustomerPayment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerPaymentRepository extends JpaRepository<CustomerPayment, Long> {
    List<CustomerPayment> findTop100ByShopIdAndCustomerIdOrderByCreatedAtDesc(Long shopId, Long customerId);
}
