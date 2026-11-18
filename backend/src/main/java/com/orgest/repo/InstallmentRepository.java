package com.orgest.repo;

import com.orgest.domain.Installment;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InstallmentRepository extends JpaRepository<Installment, Long> {
    Optional<Installment> findByIdAndShopId(Long id, Long shopId);
    List<Installment> findBySaleIdAndShopIdOrderBySeqAsc(Long saleId, Long shopId);
    List<Installment> findByShopIdOrderByDueDateAscSeqAsc(Long shopId);
    long countByShopIdAndPaidFalseAndDueDateBefore(Long shopId, LocalDate date);

    @Query("select coalesce(sum(i.amount),0) from Installment i where i.shopId = :shop and i.paid = false")
    BigDecimal outstanding(@Param("shop") Long shop);
}
