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
        select i from Item i where i.shopId = :shop and i.status in :statuses
        and (:q = '' or lower(i.name) like lower(concat('%', :q, '%')) or lower(i.ref) like lower(concat('%', :q, '%')))
        and (:karat = 0 or i.karat = :karat)
        order by i.createdAt desc""")
    Page<Item> search(@Param("shop") Long shop, @Param("statuses") Collection<Enums.ItemStatus> statuses,
                      @Param("q") String q, @Param("karat") int karat, Pageable pageable);

    /** Poids total en stock = Σ poids unitaire × quantité. */
    @Query("select coalesce(sum(i.weightG * i.quantity),0) from Item i where i.shopId = :shop and i.quantity > 0")
    BigDecimal stockWeight(@Param("shop") Long shop);

    /** Nombre de pièces en stock (Σ quantités). */
    @Query("select coalesce(sum(i.quantity),0) from Item i where i.shopId = :shop")
    long stockPieces(@Param("shop") Long shop);

    @Query("select count(l) from SaleLine l where l.itemId = :id")
    long saleLineCount(@Param("id") Long id);

    @Query("select i from Item i where i.shopId = :shop and i.quantity > 0")
    List<Item> inStock(@Param("shop") Long shop);

    @Query("select i from Item i where i.shopId = :shop order by i.createdAt desc")
    List<Item> allForExport(@Param("shop") Long shop);
}
