package com.orgest.repo;

import com.orgest.domain.Enums;
import com.orgest.domain.Item;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findByIdAndShopId(Long id, Long shopId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Item> findByShopIdAndIdIn(Long shopId, Collection<Long> ids);
    boolean existsByShopIdAndRef(Long shopId, String ref);
    long countByShopIdAndStatus(Long shopId, Enums.ItemStatus status);

    @Query("""
        select i from Item i where i.shopId = :shop and i.status = :status
        and (:q = '' or lower(i.name) like lower(concat('%', :q, '%')) or lower(i.ref) like lower(concat('%', :q, '%')))
        and (:karat = 0 or i.karat = :karat)
        order by i.createdAt desc""")
    Page<Item> search(@Param("shop") Long shop, @Param("status") Enums.ItemStatus status,
                      @Param("q") String q, @Param("karat") int karat, Pageable pageable);

    @Query("select coalesce(sum(i.weightG),0) from Item i where i.shopId = :shop and i.status = :st")
    BigDecimal stockWeight(@Param("shop") Long shop, @Param("st") Enums.ItemStatus st);

    @Query("select i from Item i where i.shopId = :shop and i.status = :st")
    List<Item> inStock(@Param("shop") Long shop, @Param("st") Enums.ItemStatus st);

    @Query("select i from Item i where i.shopId = :shop order by i.createdAt desc")
    List<Item> allForExport(@Param("shop") Long shop);
}
