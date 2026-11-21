package com.orgest.repo;

import com.orgest.domain.Sale;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleRepository extends JpaRepository<Sale, Long> {
    @Query("select s from Sale s left join fetch s.lines where s.id = :id and s.shopId = :shop")
    Optional<Sale> findDetail(@Param("id") Long id, @Param("shop") Long shop);

    Page<Sale> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);

    @Query("select s from Sale s where s.shopId = :shop and s.createdAt >= :from and s.createdAt < :to order by s.createdAt desc")
    List<Sale> between(@Param("shop") Long shop, @Param("from") Instant from, @Param("to") Instant to);

    @Query("select coalesce(sum(s.subtotal),0) from Sale s where s.shopId = :shop and s.createdAt >= :from and s.createdAt < :to")
    BigDecimal totalBetween(@Param("shop") Long shop, @Param("from") Instant from, @Param("to") Instant to);

    @Query("select count(s) from Sale s where s.shopId = :shop and s.createdAt >= :from and s.createdAt < :to")
    long countBetween(@Param("shop") Long shop, @Param("from") Instant from, @Param("to") Instant to);

    /** Ventes du mois par catégorie d'article (lignes hors stock regroupées sous « AUTRE »). Colonnes : catégorie, total, pièces. */
    @Query("select coalesce(i.category, 'AUTRE'), coalesce(sum(l.lineTotal),0), coalesce(sum(l.quantity),0) "
         + "from SaleLine l join l.sale s left join Item i on i.id = l.itemId "
         + "where s.shopId = :shop and s.createdAt >= :from and s.createdAt < :to "
         + "group by coalesce(i.category, 'AUTRE') order by sum(l.lineTotal) desc")
    List<Object[]> categoryTotals(@Param("shop") Long shop, @Param("from") Instant from, @Param("to") Instant to);

    @Query("select coalesce(sum(s.creditDue),0) from Sale s where s.shopId = :shop")
    BigDecimal creditTotal(@Param("shop") Long shop);

    @Query("select count(distinct s.customerId) from Sale s where s.shopId = :shop and s.creditDue > 0")
    long creditCustomers(@Param("shop") Long shop);

    @Query("select s.customerId, sum(s.creditDue) from Sale s where s.shopId = :shop and s.customerId in :ids group by s.customerId")
    List<Object[]> creditByCustomer(@Param("shop") Long shop, @Param("ids") java.util.Collection<Long> ids);

    @jakarta.persistence.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<Sale> findByShopIdAndCustomerIdAndCreditDueGreaterThanOrderByCreatedAtAsc(Long shopId, Long customerId, BigDecimal min);

    Page<Sale> findByShopIdAndCustomerIdOrderByCreatedAtDesc(Long shopId, Long customerId, Pageable pageable);

    @Query("select count(s) from Sale s where s.shopId = :shop and s.type = :type and s.createdAt >= :from and s.createdAt < :to")
    long exchangesBetween(@Param("shop") Long shop, @Param("type") com.orgest.domain.Enums.SaleType type, @Param("from") Instant from, @Param("to") Instant to);
}
