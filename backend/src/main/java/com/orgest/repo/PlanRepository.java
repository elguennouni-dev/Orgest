package com.orgest.repo;

import com.orgest.domain.Plan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    List<Plan> findAllByOrderByMonthsAsc();
    List<Plan> findByActiveTrueOrderByMonthsAsc();
}
