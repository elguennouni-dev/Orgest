package com.orgest.repo;

import com.orgest.domain.Customer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByIdAndShopId(Long id, Long shopId);
    List<Customer> findByShopIdAndPhone(Long shopId, String phone);
    List<Customer> findByShopIdAndNameIgnoreCase(Long shopId, String name);

    @Query("""
        select c from Customer c where c.shopId = :shop
        and (:q = '' or lower(c.name) like lower(concat('%', :q, '%')) or coalesce(c.phone,'') like concat('%', :q, '%'))
        and (:debt = false or exists (select 1 from Sale s where s.customerId = c.id and s.creditDue > 0))
        order by lower(c.name)""")
    Page<Customer> search(@Param("shop") Long shop, @Param("q") String q, @Param("debt") boolean debt, Pageable pageable);
}
